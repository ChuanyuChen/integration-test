"""Smoke-test fixture: contains a test with a wrong assertion (for openan-e2e-test-regression to fix).

Source case: FIT-registry-center-agentcard-001 (register a valid Agent successfully)
BUG: successful registration should return 201, but the fixture asserts 200.
"""


def register_agent(name):
    """Simulate registry-center behavior."""
    return 201 if name else 400


def test_register_agent_success():
    """FIT-registry-center-agentcard-001: register a valid Agent successfully"""
    assert register_agent("fault-mgmt-agent") == 200  # noqa: E501 -- intentionally wrong; 201 expected
