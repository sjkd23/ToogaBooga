import {PrivateApiDefinitions} from "../private-api/PrivateApiDefinitions";
import {IPropertyKeyValuePair} from "./MiscInterfaces";

/**
 * An interface that has the verification-related channels.
 */
export interface IVerificationChannels {
    /**
     * The verification channel ID. This will usually be the `#get-verified` channel.
     *
     * @type {string}
     */
    verificationChannelId: string;

    /**
     * The manual verification channel ID. This is where manual verification requests will be sent.
     *
     * @type {string}
     */
    manualVerificationChannelId: string;
}

/**
 * An interface that represents the properties used for verification.
 */
export interface IVerificationProperties {
    /**
     * Any message to show on the verification embed.
     *
     * @type {string}
     */
    additionalVerificationInfo: string;

    /**
     * The message to send to the user when he or she successfully verifies.
     *
     * @type {string}
     */
    verificationSuccessMessage: string;

    /**
     * The verification requirements.
     *
     * @type {IVerificationRequirements}
     */
    verificationRequirements: IVerificationRequirements;

    /**
     * Whether to check the requirements at all. If this is `true`, then this will check RealmEye. If this is
     * `false`, then this will not check RealmEye at all and will immediately give the verified role.
     *
     * @type {boolean}
     */
    checkRequirements: boolean;
}

/**
 * An interface that represents the verification requirements for this section or server.
 */
export interface IVerificationRequirements {
    /**
     * The alive fame requirement.
     *
     * @type {object}
     */
    aliveFame: {
        /**
         * Whether to check this requirement.
         *
         * @type {boolean}
         */
        checkThis: boolean;

        /**
         * The minimum amount of alive fame needed to pass this requirement.
         *
         * @type {number}
         */
        minFame: number;
    };

    /**
     * The guild requirement.
     *
     * @type {object}
     */
    guild: {
        /**
         * Whether to check this requirement.
         *
         * @type {boolean}
         */
        checkThis: boolean;

        /**
         * The guild name requirement.
         *
         * @type {object}
         */
        guildName: {
            /**
             * Whether to check this requirement.
             *
             * @type {boolean}
             */
            checkThis: boolean;

            /**
             * The guild that the user must be in. To pass this requirement, the user must be in this guild.
             *
             * @type {string}
             */
            name: string;
        };

        /**
         * The guild rank requirement.
         *
         * @type {object}
         */
        guildRank: {
            /**
             * Whether to check this requirement.
             *
             * @type {boolean}
             */
            checkThis: boolean;

            /**
             * The minimum guild rank needed for the user to pass this requirement. This is ordered by:
             * ```
             * Initiate < Member < Officer < Leader
             * ```
             *
             * @type {string}
             */
            minRank: string;
        };
    };

    /**
     * The last seen requirement.
     *
     * @type {object}
     */
    lastSeen: {
        /**
         * Whether the user's last-seen location must be hidden.
         *
         * @type {boolean}
         */
        mustBeHidden: boolean;
    };

    /**
     * The rank requirement.
     *
     * @type {object}
     */
    rank: {
        /**
         * Whether to check this requirement.
         *
         * @type {boolean}
         */
        checkThis: boolean;

        /**
         * The minimum number of stars (rank) needed to pass this requirement.
         *
         * @type {number}
         */
        minRank: number;
    };

    /**
     * The character requirement.
     *
     * @type {object}
     */
    characters: {
        /**
         * Whether to check this requirement.
         *
         * @type {boolean}
         */
        checkThis: boolean;

        /**
         * The number of maxed classes needed to pass this requirement. This is listed by:
         * ```
         * [0/8, 1/8, 2/8, 3/8, 4/8, 5/8, 6/8, 7/8, 8/8]
         * ```
         *
         * For example, if we have [0, 0, 2, 1, 0, 0, 0, 0], then this means that:
         * - You need 2 2/8s
         * - And 1 3/8
         *
         * @type {number[]}
         */
        statsNeeded: [number, number, number, number, number, number, number, number, number];

        /**
         * Whether to check past deaths (via graveyard summary).
         *
         * @type {boolean}
         */
        checkPastDeaths: boolean;
    };

    /**
     * The exaltation requirements.
     *
     * @type {object}
     */
    exaltations: {
        /**
         * Whether to check this requirement.
         *
         * @type {boolean}
         */
        checkThis: boolean;

        /**
         * The minimum number of exaltations (for the particular stat) needed.
         */
        minimum: {
            [stat: string]: number;

            /**
             * Health exaltations (0 <= x <= 5).
             *
             * @type {number}
             */
            hp: number;

            /**
             * Magic exaltations (0 <= x <= 5).
             *
             * @type {number}
             */
            mp: number;

            /**
             * Defense exaltations (0 <= x <= 5).
             *
             * @type {number}
             */
            def: number;

            /**
             * Attack exaltations (0 <= x <= 5).
             *
             * @type {number}
             */
            att: number;

            /**
             * Dexterity exaltations (0 <= x <= 5).
             *
             * @type {number}
             */
            dex: number;

            /**
             * Speed exaltations (0 <= x <= 5).
             *
             * @type {number}
             */
            spd: number;

            /**
             * Vitality exaltations (0 <= x <= 5).
             *
             * @type {number}
             */
            vit: number;

            /**
             * Wisdom exaltations (0 <= x <= 5).
             *
             * @type {number}
             */
            wis: number;
        };
    };

    /**
     * The graveyard summary requirements.
     *
     * @type {object}
     */
    graveyardSummary: {
        /**
         * Whether to check this requirement.
         *
         * @type {boolean}
         */
        checkThis: boolean;

        /**
         * The specified summary type and the minimum number of that needed to pass the requirement. For example,
         * you might have something like:
         * ```
         *  [
         *      {
         *          key: "Tiles uncovered",
         *          value: 200_000_000
         *      },
         *      {
         *          key: "Secluded Thickets completed",
         *          value: 30
         *      },
         *      {
         *          key: "Nests completed2",
         *          value: 15
         *      }
         *  ]
         * ```
         *
         * In this example, all the above requirements must be passed.
         *
         * @type {IPropertyKeyValuePair<string, number>[]}
         */
        minimum: IPropertyKeyValuePair<string, number>[];
    };
}

/**
 * An interface representing a manual verification entry.
 */
export interface IManualVerificationEntry {
    /**
     * The user (Discord) ID.
     *
     * @type {string}
     */
    userId: string;

    /**
     * The IGN used to verify.
     *
     * @type {string}
     */
    ign: string;

    /**
     * The person's name history.
     *
     * @type {PrivateApiDefinitions.INameHistory}
     */
    nameHistory: PrivateApiDefinitions.INameHistory;

    /**
     * The manual verification message ID. This is the message that staff will have to acknowledge (i.e.
     * react to) to approve/deny this request.
     *
     * @type {string}
     */
    manualVerifyMsgId: string;

    /**
     * The manual verification channel ID. This is where the message corresponding to `manualVerifyMsgID` will be
     * sent to.
     *
     * @type {string}
     */
    manualVerifyChannelId: string;

    /**
     * The ID corresponding to the person that is currently looking at this.
     *
     * @type {string}
     */
    currentHandler: string;
}