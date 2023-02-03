import { pBSToData, punBData } from "../../stdlib/Builtins";
import { PData } from "./PData";
import { DataB } from "../../../../types/Data/DataB";
import { ByteString } from "../../../../types/HexString/ByteString";
import { UPLCConst } from "../../../UPLC/UPLCTerms/UPLCConst";
import { Term } from "../../Term";
import { Type } from "../../Term/Type/base";
import { PByteString } from "../PByteString";

export class PDataBS extends PData // (PData extends PType => PDataBS extends PType too)
{
    constructor( bs: ByteString | Buffer = Buffer.from([]) )
    {
        super( new DataB( bs ) );
    }
}

export function pDataBS( bs: ByteString | Buffer ): Term<PDataBS>
{
    return new Term(
        Type.Data.BS,
        _dbn => UPLCConst.data( new DataB( bs ) )
    );
}

export function ptoDataBS( bsTerm: Term<PByteString> ): Term<PDataBS>
{
    return pBSToData.$( bsTerm );
}

export function pByteStringFromData( dataBSTerm: Term<PDataBS> ): Term<PByteString>
{
    return punBData.$( dataBSTerm );
}