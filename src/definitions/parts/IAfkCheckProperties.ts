import {IPropertyKeyValuePair} from "../IPropertyKeyValuePair";
import {IPermAllowDeny} from "../IPermAllowDeny";
import {IAfkCheckOptionData} from "./IAfkCheckOptionData";

export interface IAfkCheckProperties {
    vcLimit: number;
    // this does NOT apply to key early location.
    // one can override that in the dungeonSettingOverride property.
    nitroEarlyLocationLimit: number;
    // message that will be shown to everyone
    // during the afk check
    additionalAfkCheckInfo: string;
    // whether to remove key reacts during afk check
    removeKeyReactsDuringAfk: boolean;
    // afk check timeout (how long until afk ends), in minutes.
    afkCheckTimeout: number;
    // default dungeons -- use codeName
    defaultDungeon: string;
    // whether people that react w/ key emoji can bypass a full vc
    bypassFullVcOption: BypassFullVcOption;
    // afk check configuration
    afkCheckPermissions: IPropertyKeyValuePair<string, IPermAllowDeny>[];
    // pre/post afk check configuration
    prePostAfkCheckPermissions: IPropertyKeyValuePair<string, IPermAllowDeny>[];

    // allowed dungeons (use codeName)
    allowedDungeons: string[];
    // Any dungeon overrides. This is on a per-section basis
    dungeonSettingsOverride: {
        dungeonCodeName: string;
        keyData: IAfkCheckOptionData[];
        buttonInfo: IAfkCheckOptionData[];
        includeEarlyLoc?: boolean;
        vcLimit: number;
    }[];
}

export enum BypassFullVcOption {
    NotAllowed = (1 << 0),
    KeysOnly = (1 << 1),
    KeysAndPriority = (1 << 2)
}