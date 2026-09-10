// ---------------- Type Definitions which can be imported from ./RuntimeTypes -------------------------
export interface TableRegistrations extends BaseTableRegistrations {
    "andy_prizes": andy_prizes,
    "andy_prizetypes": andy_prizetypes,
}
export interface EnumRegistrations extends BaseEnumRegistrations {
    "andy_prizes-andy_prizetaken": andy_prizes_andy_prizetaken,
    "andy_prizes-statecode": andy_prizes_statecode,
    "andy_prizes-statuscode": andy_prizes_statuscode,
    "andy_prizetypes-andy_isfallback": andy_prizetypes_andy_isfallback,
    "andy_prizetypes-statecode": andy_prizetypes_statecode,
    "andy_prizetypes-statuscode": andy_prizetypes_statuscode,
}
export type andy_prizes = TableRow<{
    // Primary Key Column
    readonly andy_prizesid: string,
    // Foreign Key Column
    readonly _andy_gamewin_value: `/andy_gamewin(${string})`,
    readonly andy_gamewinname: string,
    andy_prizeinfo: string,
    andy_prizename: string,
    andy_prizetaken: andy_prizes_andy_prizetaken,
    // Foreign Key Column
    _andy_prizetype_value: `/andy_prizetypes(${string})`,
    readonly andy_prizetypename: string,
    andy_prizewinner: string,
    readonly createdbyname: string,
    readonly createdbyyominame: string,
    readonly createdonbehalfbyname: string,
    readonly createdonbehalfbyyominame: string,
    readonly modifiedbyname: string,
    readonly modifiedbyyominame: string,
    readonly modifiedonbehalfbyname: string,
    readonly modifiedonbehalfbyyominame: string,
    readonly owningbusinessunitname: string,
    statecode: andy_prizes_statecode,
    statuscode: andy_prizes_statuscode,
}>

export type andy_prizetypes = TableRow<{
    // Primary Key Column
    readonly andy_prizetypesid: string,
    andy_color: string,
    andy_isfallback: andy_prizetypes_andy_isfallback,
    // This is an image encoded as a base64 string
    andy_prizeimage: string,
    readonly andy_prizeimage_timestamp: number,
    readonly andy_prizeimage_url: string,
    readonly andy_prizeimagefile_name: string,
    readonly andy_prizeimageid: string,
    andy_prizeimagesvg: string,
    andy_prizetypeimage: string,
    andy_prizetypename: string,
    andy_rarity: number,
    readonly createdbyname: string,
    readonly createdbyyominame: string,
    readonly createdonbehalfbyname: string,
    readonly createdonbehalfbyyominame: string,
    readonly modifiedbyname: string,
    readonly modifiedbyyominame: string,
    readonly modifiedonbehalfbyname: string,
    readonly modifiedonbehalfbyyominame: string,
    readonly owningbusinessunitname: string,
    statecode: andy_prizetypes_statecode,
    statuscode: andy_prizetypes_statuscode,
}>

const enum andy_prizes_andy_prizetaken {
"No" = 0,
"Yes" = 1,
}
const enum andy_prizes_statecode {
"Active" = 0,
"Inactive" = 1,
}
const enum andy_prizes_statuscode {
"Active" = 1,
"Inactive" = 2,
}
const enum andy_prizetypes_andy_isfallback {
"No" = 0,
"Yes" = 1,
}
const enum andy_prizetypes_statecode {
"Active" = 0,
"Inactive" = 1,
}
const enum andy_prizetypes_statuscode {
"Active" = 1,
"Inactive" = 2,
}

export interface UxAgentDataApi extends BaseUxAgentDataApi<TableRegistrations, EnumRegistrations> {}

export interface GeneratedComponentProps {
    dataApi: UxAgentDataApi;
}

