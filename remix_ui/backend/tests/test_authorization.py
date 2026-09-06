from backend.backend.authorization import authorize


def test_admin_can_access_all_permissions():
    assert authorize("Admin", ["customers.write", "journal.write", "reports.read"]) is True


def test_accountant_cannot_edit_operations():
    assert authorize("Accountant", ["operations.write"]) is False


def test_data_entry_can_write_operations():
    assert authorize("Data_Entry", ["operations.write"]) is True
