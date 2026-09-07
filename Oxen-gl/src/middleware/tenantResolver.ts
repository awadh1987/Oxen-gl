import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  customDomain?: string | null;
  tier: 'starter' | 'standard' | 'growth' | 'enterprise';
  isActive: boolean;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    themeMode: 'LIGHT' | 'DARK' | 'CUSTOM';
    logoUrl?: string | null;
  };
  rlsSchema: string;
}

export type ExecutionPlane = 'master' | 'tenant' | 'root' | 'unknown';

export interface ExtendedRequest extends Request {
  plane?: ExecutionPlane;
  tenant?: TenantContext | null;
  [key: string]: any;
}

// In-Memory LRU Cache with TTL for high-throughput DNS/subdomain lookups
class TenantResolutionCache {
  private cache = new Map<string, { tenant: TenantContext | null; expiresAt: number }>();
  private readonly ttlMs: number;

  constructor(ttlMinutes = 5) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get(host: string): TenantContext | null | undefined {
    const entry = this.cache.get(host.toLowerCase());
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(host.toLowerCase());
      return undefined;
    }
    return entry.tenant;
  }

  set(host: string, tenant: TenantContext | null): void {
    this.cache.set(host.toLowerCase(), {
      tenant,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(host: string): void {
    this.cache.delete(host.toLowerCase());
  }

  clear(): void {
    this.cache.clear();
  }
}

export const tenantCache = new TenantResolutionCache(5);

// Pre-seeded multi-tenant registry for standard dev & test environments
export const registeredTenants: Record<string, TenantContext> = {
  'horizon-logistics': {
    id: '6ab52593-ab47-4eee-8779-0cdfbb2762da',
    slug: 'horizon-logistics',
    name: 'شركة هورايزون للخدمات اللوجستية (Horizon Logistics)',
    customDomain: 'transport.horizon.sa',
    tier: 'enterprise',
    isActive: true,
    theme: {
      primaryColor: '#F05627',
      secondaryColor: '#1E3A8A',
      themeMode: 'CUSTOM',
      logoUrl: '/logo.png',
    },
    rlsSchema: 'tenant_horizon_logistics',
  },
  'meayon-transport': {
    id: '317f6c7c-7842-4db1-a464-ea9d5f924e22',
    slug: 'meayon-transport',
    name: 'شركة ميون للنقل والخدمات اللوجستية',
    customDomain: 'fleet.meayon.com',
    tier: 'growth',
    isActive: true,
    theme: {
      primaryColor: '#F59E0B',
      secondaryColor: '#10B981',
      themeMode: 'LIGHT',
      logoUrl: '/logo.png',
    },
    rlsSchema: 'tenant_meayon_transport',
  },
  'riyadh-aggregates': {
    id: '8a3e9c12-5b6d-4f7e-9123-0c4b6e8f1a23',
    slug: 'riyadh-aggregates',
    name: 'مؤسسة الرياض لتجارة ونقل البحص والرمل',
    customDomain: 'portal.riyadh-aggregates.sa',
    tier: 'standard',
    isActive: true,
    theme: {
      primaryColor: '#8B5CF6',
      secondaryColor: '#06B6D4',
      themeMode: 'DARK',
      logoUrl: '/logo.png',
    },
    rlsSchema: 'tenant_riyadh_aggregates',
  },
};

// Map of Custom Domains -> Tenant Slugs
export const customDomainRegistry: Record<string, string> = {
  'transport.horizon.sa': 'horizon-logistics',
  'fleet.meayon.com': 'meayon-transport',
  'portal.riyadh-aggregates.sa': 'riyadh-aggregates',
  'custom-client-domain.com': 'horizon-logistics',
};

// Standard platform root domains
const ROOT_DOMAINS = ['app.oxengl.com', 'oxengl.com', 'localhost', '127.0.0.1'];
const MASTER_SUBDOMAINS = ['admin.oxengl.com', 'admin.localhost', 'master.oxengl.com'];

/**
 * Express Middleware: Intercepts request, extracts Host header,
 * resolves subdomain or custom domain, and attaches req.tenant.
 */
export function tenantResolverMiddleware(req: ExtendedRequest, res: Response, next: NextFunction): void {
  const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost').toString();
  // Strip port if present (e.g., localhost:3000 -> localhost)
  const hostname = hostHeader.split(':')[0].toLowerCase();

  // 1. Check Master Platform Admin Domains
  if (MASTER_SUBDOMAINS.includes(hostname) || req.headers['x-admin-plane'] === 'true') {
    req.plane = 'master';
    req.tenant = null;
    res.setHeader('X-Platform-Plane', 'master');
    return next();
  }

  // 2. Check Cache
  const cached = tenantCache.get(hostname);
  if (cached !== undefined) {
    if (cached) {
      req.plane = 'tenant';
      req.tenant = cached;
      res.setHeader('X-Platform-Plane', 'tenant');
      res.setHeader('X-Tenant-ID', cached.id);
      res.setHeader('X-Tenant-Slug', cached.slug);
      return next();
    }
  }

  // 3. Check Explicit Header Overrides (useful for API clients and test suites)
  const explicitSlug = req.headers['x-tenant-slug'] as string;
  if (explicitSlug && registeredTenants[explicitSlug]) {
    const tenant = registeredTenants[explicitSlug];
    req.plane = 'tenant';
    req.tenant = tenant;
    tenantCache.set(hostname, tenant);
    res.setHeader('X-Platform-Plane', 'tenant');
    res.setHeader('X-Tenant-ID', tenant.id);
    res.setHeader('X-Tenant-Slug', tenant.slug);
    return next();
  }

  // 4. Check Custom Domains (e.g. transport.horizon.sa)
  if (customDomainRegistry[hostname]) {
    const slug = customDomainRegistry[hostname];
    const tenant = registeredTenants[slug];
    if (tenant && tenant.isActive) {
      req.plane = 'tenant';
      req.tenant = tenant;
      tenantCache.set(hostname, tenant);
      res.setHeader('X-Platform-Plane', 'tenant');
      res.setHeader('X-Tenant-ID', tenant.id);
      res.setHeader('X-Tenant-Slug', tenant.slug);
      return next();
    }
  }

  // 5. Check Wildcard Subdomains: {slug}.oxengl.com or {slug}.localhost
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const potentialSlug = parts[0];
    if (potentialSlug !== 'www' && potentialSlug !== 'app' && potentialSlug !== 'admin') {
      const tenant = registeredTenants[potentialSlug];
      if (tenant && tenant.isActive) {
        req.plane = 'tenant';
        req.tenant = tenant;
        tenantCache.set(hostname, tenant);
        res.setHeader('X-Platform-Plane', 'tenant');
        res.setHeader('X-Tenant-ID', tenant.id);
        res.setHeader('X-Tenant-Slug', tenant.slug);
        return next();
      }
    }
  }

  // 6. Check Root Platform Domain (Landing Portal / Unified Login)
  if (ROOT_DOMAINS.includes(hostname) || hostname === 'localhost' || hostname === '127.0.0.1') {
    req.plane = 'root';
    req.tenant = null;
    res.setHeader('X-Platform-Plane', 'root');
    return next();
  }

  // 7. Unrecognized Domain
  req.plane = 'unknown';
  req.tenant = null;
  res.setHeader('X-Platform-Plane', 'unknown');
  next();
}
