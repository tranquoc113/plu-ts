import { pstruct } from "../../../../PTypes/PStruct/pstruct";
import { int } from "../../../../Term/Type/base";
import { isConstantableStructDefinition } from "../../../../Term/Type/kinds";
import { PPubKeyHash } from "../../PubKey/PPubKeyHash";
import { PValidatorHash } from "../../ScriptsHashes/PValidatorHash";
import { PCredential } from "../PCredential";


describe("PStakingCredential", () => {

    test("def", () => {

        const PCredentialSDef = {
            PPubKeyCredential: { pkh: PPubKeyHash.type },
            PScriptCredential: { valHash: PValidatorHash.type },
        };

        expect(
            isConstantableStructDefinition( PCredentialSDef )
        ).toBe( true )

        expect(
            isConstantableStructDefinition({
                PStakingHash: { _0: PCredential.type },
                PStakingPtr: {
                    _0: int,
                    _1: int,
                    _2: int
                }
            })
        ).toBe( true )

        const TestPStakingCredential = pstruct({
            PStakingHash: { _0: PCredential.type },
            PStakingPtr: {
                _0: int,
                _1: int,
                _2: int
            }
        });
        
    })
})