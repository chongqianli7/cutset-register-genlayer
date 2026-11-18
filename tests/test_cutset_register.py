import json
from unittest import TestCase
from host import load, UserError

gl, mod = load("cutset_register")
OWNER = "0x" + "1"*40
REVIEWER = "0x" + "2"*40


class CutsetTest(TestCase):
    def setUp(self):
        self.contract = mod.CutsetRegister()
        self.contract.cases = {}
        gl.message.sender_address = OWNER

    def compile(self):
        self.contract.compile("queue", REVIEWER, '["primary", "secondary", "routing"]',
                              "Routing or both primary and secondary")

    def test_canonical_equivalence_and_full_signed_flow(self):
        outputs = iter(['{"terms":[[1,0],[2],[2,0]]}', '{"terms":[[2],[0,1]]}'])
        gl.nondet.exec_prompt = lambda _: next(outputs)
        self.compile()
        self.assertEqual(json.loads(self.contract.review("queue"))["cuts"], [3, 4])
        with self.assertRaisesRegex(UserError, "CLOSED_OR_UNCOVERED"):
            self.contract.close("queue")
        with self.assertRaisesRegex(UserError, "REVIEWER_REQUIRED"):
            self.contract.attest("queue", 0, "independent note")
        gl.message.sender_address = REVIEWER
        self.contract.attest("queue", 0, "independent note")
        with self.assertRaisesRegex(UserError, "NO_NEW_COVERAGE"):
            self.contract.attest("queue", 1, "equivalent protection")
        self.contract.attest("queue", 2, "routing protection")
        gl.message.sender_address = OWNER
        self.contract.close("queue")
        self.assertEqual(json.loads(self.contract.review("queue"))["state"], "CLOSED")

    def test_disagreement_keeps_case_absent(self):
        outputs = iter(['{"terms":[[0],[1]]}', '{"terms":[[0,1]]}'])
        gl.nondet.exec_prompt = lambda _: next(outputs)
        with self.assertRaisesRegex(UserError, "NO_CONSENSUS"):
            self.compile()
        self.assertEqual(self.contract.review("queue"), "")

    def test_out_of_range_and_non_monotone(self):
        for text, code in [('{"terms":[[3]]}', "INVALID_MODEL"), ('{"unsupported":true}', "UNSUPPORTED_RULE")]:
            gl.nondet.exec_prompt = lambda _: text
            with self.assertRaisesRegex(UserError, code):
                self.compile()
