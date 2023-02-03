import JsRuntime from "../../../../utils/JsRuntime";
import ObjectUtils from "../../../../utils/ObjectUtils";

import { maybeData } from "../../../../types/Data/toData/maybeData";
import { dataFromCborObj } from "../../../../types/Data/fromCbor";
import { Data, isData } from "../../../../types/Data";
import { ToCbor } from "../../../../cbor/interfaces/CBORSerializable";
import { Script, ScriptType } from "../../../script/Script";
import { CborString, CanBeCborString, forceCborString } from "../../../../cbor/CborString";
import { Value } from "../../../ledger/Value/Value";
import { CborMap, CborMapEntry } from "../../../../cbor/CborObj/CborMap";
import { dataToCborObj } from "../../../../types/Data/toCbor";
import { IValue } from "../../../ledger/Value/IValue";
import { Hash32 } from "../../../hashes/Hash32/Hash32";
import { Cbor } from "../../../../cbor/Cbor";
import { Address } from "../../../ledger/Address";
import { CborUInt } from "../../../../cbor/CborObj/CborUInt";
import { CborArray } from "../../../../cbor/CborObj/CborArray";
import { CborTag } from "../../../../cbor/CborObj/CborTag";
import { CborBytes } from "../../../../cbor/CborObj/CborBytes";
import { Cloneable } from "../../../../types/interfaces/Cloneable";
import { ToData } from "../../../../types/Data/toData/interface";
import { DataConstr } from "../../../../types/Data/DataConstr";
import { BasePlutsError } from "../../../../errors/BasePlutsError";
import { ToJson } from "../../../../utils/ts/ToJson";
import { CborObj } from "../../../../cbor/CborObj";
import { InvalidCborFormatError } from "../../../../errors/InvalidCborFormatError";

export type AddressStr = `${"addr1"|"addr_test1"}${string}`;

export interface ITxOut {
    address: Address | AddressStr,
    amount: Value | IValue,
    datum?: Hash32 | Data,
    refScript?: Script
}
export class TxOut
    implements ITxOut, ToCbor, Cloneable<TxOut>, ToData, ToJson
{
    readonly address!: Address
    readonly amount!: Value
    readonly datum?: Hash32 | Data
    readonly refScript?: Script

    constructor( txOutput: ITxOut )
    {
        JsRuntime.assert(
            ObjectUtils.isObject( txOutput ) &&
            ObjectUtils.hasOwn( txOutput, "address" ) &&
            ObjectUtils.hasOwn( txOutput, "amount" ),
            "txOutput is missing some necessary fields"
        );

        const {
            address,
            amount,
            datum,
            refScript
        } = txOutput;

        JsRuntime.assert(
            address instanceof Address,
            "invlaid 'address' while constructing 'TxOut'" 
        );
        JsRuntime.assert(
            amount instanceof Value,
            "invlaid 'amount' while constructing 'TxOut'" 
        );

        ObjectUtils.defineReadOnlyProperty(
            this,
            "address",
            address
        );
        ObjectUtils.defineReadOnlyProperty(
            this,
            "amount",
            amount
        );

        if( datum !== undefined )
            JsRuntime.assert(
                datum instanceof Hash32 || isData( datum ),
                "invalid 'datum' field"
            );
        ObjectUtils.defineReadOnlyProperty(
            this,
            "datum",
            datum
        );

        if( refScript !== undefined )
            JsRuntime.assert(
                refScript instanceof Script,
                "invalid 'refScript' field"
            );
        ObjectUtils.defineReadOnlyProperty(
            this,
            "refScript",
            refScript
        );
    }

    clone(): TxOut
    {
        return new TxOut({
            address: this.address.clone(),
            amount: this.amount.clone(),
            datum: this.datum?.clone(),
            refScript: this.refScript?.clone() 
        })
    }

    static get fake(): TxOut
    {
        return new TxOut({
            address: Address.fake,
            amount: Value.lovelaces( 0 ),
            datum: undefined,
            refScript: undefined
        })
    }

    toData( version: "v1" | "v2" = "v2" ): Data
    {
        if( version === "v1" )
        {
            if( isData( this.datum ) )
            throw new BasePlutsError(
                "trying to convert v2 utxo to v1"
            );

            return new DataConstr(
                0,
                [
                    this.address.toData(),
                    this.amount.toData(),
                    maybeData( this.datum?.toData() )
                ]
            )
        }

        const datumData =
            this.datum === undefined ?
                new DataConstr( 0, [] ) : 
            this.datum instanceof Hash32 ?
                new DataConstr( 1, [ this.datum.toData() ]) :
            this.datum; // inline

        return new DataConstr(
            0,
            [
                this.address.toData(),
                this.amount.toData(),
                datumData,
                maybeData( this.refScript?.hash.toData() )
            ]
        )
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborMap
    {
        const datum = this.datum;

        return new CborMap([
            {
                k: new CborUInt( 0 ),
                v: this.address.toCborObj()
            },
            {
                k: new CborUInt( 1 ),
                v: this.amount.toCborObj()
            },
            datum === undefined ? undefined :
            {
                k: new CborUInt( 2 ),
                v: datum instanceof Hash32 ? 
                    new CborArray([
                        new CborUInt( 0 ),
                        datum.toCborObj()
                    ]) :
                    new CborArray([
                        new CborUInt( 0 ),
                        new CborUInt( 1 ),
                        dataToCborObj( datum )
                    ])
            },
            this.refScript === undefined ? undefined :
            {
                k: new CborUInt( 3 ),
                v: new CborTag( 24, new CborBytes( this.refScript.cbor ) )
            }
        ].filter( elem => elem !== undefined ) as CborMapEntry[])
    }

    static fromCbor( cStr: CanBeCborString ): TxOut
    {
        return TxOut.fromCborObj( Cbor.parse( forceCborString( cStr ) ) );
    }
    static fromCborObj( cObj: CborObj ): TxOut
    {
        if(!( cObj instanceof CborMap ))
        throw new InvalidCborFormatError("TxOut");

        let fields: (CborObj | undefined )[] = new Array( 4 ).fill( undefined );

        for( let i = 0; i < 4; i++)
        {
            const { v } = (cObj as CborMap).map.find(
                ({ k }) => {
                    if(!( k instanceof CborUInt ))
                    throw new InvalidCborFormatError("TxBody");

                    return Number( k.num ) === i
                }
            ) ?? { v: undefined };

            if( v === undefined ) continue;

            fields[i] = v;
        }

        const [
            _addr,
            _amt,
            _dat,
            _refScript
        ] = fields;

        let datum: Hash32 | Data | undefined = undefined;

        if( _dat !== undefined )
        {
            if(!(_dat instanceof CborArray))
            throw new InvalidCborFormatError("TxOut");

            const [ _0, _1, _2 ] = _dat.array;

            if(!(_0 instanceof CborUInt))
            throw new InvalidCborFormatError("TxOut");

            if(_1 instanceof CborBytes)
            datum = Hash32.fromCborObj( _1 )
            else
            {
                if(!(_1 instanceof CborUInt))
                throw new InvalidCborFormatError("TxOut");

                datum = dataFromCborObj( _2 )
            }
        }

        let refScript: Script | undefined = undefined;
        if( _refScript !== undefined )
        {
            if(!(
                _refScript instanceof CborTag &&
                _refScript.data instanceof CborBytes
            ))
            throw new InvalidCborFormatError("TxOut");

            refScript = new Script( ScriptType.PlutusV2, _refScript.data.buffer );
        }

        if( _addr === undefined || _amt === undefined )
        throw new InvalidCborFormatError("TxOut");

        return new TxOut({
            address: Address.fromCborObj( _addr ),
            amount:  Value.fromCborObj( _amt ),
            datum,
            refScript
        })
    }

    toJson()
    {
        return {
            address: this.address.toString(),
            amount: this.amount.toJson(),
            datum: this.datum === undefined ? undefined :
            this.datum instanceof Hash32 ?
                this.datum.toString() :
                this.datum.toJson(),
            refScript: this.refScript?.toJson()
        }
    }

}