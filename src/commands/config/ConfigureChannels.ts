import {BaseCommand} from "../BaseCommand";
import {Guild, Message, MessageButton, MessageEmbed, TextChannel} from "discord.js";
import {IGuildInfo} from "../../definitions/db/IGuildInfo";
import {FetchGetRequestUtilities} from "../../utilities/FetchGetRequestUtilities";
import {InteractivityHelper} from "../../utilities/InteractivityHelper";
import {ISectionInfo} from "../../definitions/db/ISectionInfo";
import {IConfigurationCmd} from "./IConfigurationCmd";
import {StringBuilder} from "../../utilities/StringBuilder";
import {AdvancedCollector} from "../../utilities/collectors/AdvancedCollector";
import {MessageButtonStyles} from "discord.js/typings/enums";
import {Emojis} from "../../constants/Emojis";
import getCachedChannel = FetchGetRequestUtilities.getCachedChannel;

enum ChannelCategoryType {
    RAIDING,
    VERIFICATION,
    MODMAIL,
    QUOTA,
    LOGGING,
    OTHER
}

enum DisplayFilter {
    Raids = (1 << 0),
    Verification = (1 << 1),
    Modmail = (1 << 2),
    Other = (1 << 3)
}

interface IChannelMongo {
    name: string;
    description: string;
    guildDocPath: string;
    sectionPath: string;
    type: ChannelCategoryType;
}

export class ConfigureChannelsCommand extends BaseCommand implements IConfigurationCmd {
    private NA: string = "N/A";
    private ChannelMongo: IChannelMongo[] = [
        {
            name: "Get Verified Channel",
            description: "This is the channel where users will be able to verify, via RealmEye, to gain entry into"
                + " your server or section. Conventionally, this channel is known as `#get-verified` or"
                + " `#verify-here`.",
            guildDocPath: "channels.verification.verificationChannelId",
            sectionPath: "guildSections.$.channels.verification.verificationChannelId",
            type: ChannelCategoryType.VERIFICATION
        },
        {
            name: "Manual Verification Channel",
            description: "This is the channel where manual verification requests will go. By default, these are"
                + " handled directly by the bot. If you want to manually verify someone, do it in a different channel.",
            guildDocPath: "channels.verification.manualVerificationChannelId",
            sectionPath: "guildSections.$.channels.verification.manualVerificationChannelId",
            type: ChannelCategoryType.VERIFICATION
        },
        {
            name: "AFK Check Channel",
            description: "This is the channel where AFK checks will occur. Conventionally, this channel is known as"
                + " `#raid-status-announcements` or `#afk-check`.",
            guildDocPath: "channels.raids.afkCheckChannelId",
            sectionPath: "guildSections.$.channels.raids.afkCheckChannelId",
            type: ChannelCategoryType.RAIDING
        },
        {
            name: "Control Panel Channel",
            description: "This is the channel where the raid leader will be able to execute commands such as ending"
                + " AFK checks and raids, editing the location, and more. These commands will be displayed as buttons"
                + " on an embed message. You can either set this channel to a new channel or a private bot channel.",
            guildDocPath: "channels.raids.controlPanelChannelId",
            sectionPath: "guildSections.$.channels.raids.controlPanelChannelId",
            type: ChannelCategoryType.RAIDING
        },
        {
            name: "Rate Leader Channel",
            description: "This is the channel where raiders can rate a leader's performance. You can either set this"
                + " channel to a new channel or the AFK Check channel. If this is set to the AFK Check channel, the"
                + " original AFK Check message will be edited with the poll.",
            guildDocPath: "channels.raids.rateLeaderChannel",
            sectionPath: "guildSections.$.channels.raids.rateLeaderChannel",
            type: ChannelCategoryType.RAIDING
        },
        {
            name: "Modmail Channel",
            description: "This is the channel where new modmail messages will be forwarded to. __Additionally__, in"
                + " the case a modmail *thread* text channel needs to be created, the channel will be created in the"
                + " same __category__ as the modmail channel's category.",
            guildDocPath: "channels.modmail.modmailChannelId",
            sectionPath: "",
            type: ChannelCategoryType.MODMAIL
        },
        {
            name: "Modmail Storage Channel",
            description: "This is the channel where any files from modmail messages or threads will be stored to."
                + " These files can include modmail threads conversations, modmail responses, images, and more. If"
                + " no channel is set, then the bot will store the files in a private channel in the development"
                + " server (you are able to configure this in the `configmisc` command).",
            guildDocPath: "channels.modmail.modmailStorageChannelId",
            sectionPath: "",
            type: ChannelCategoryType.MODMAIL
        },
        {
            name: "Bot Updates Channel",
            description: "This is the channel where updates and messages from the bot's developers will be forwarded"
                + " to. This is the best way to receive announcements from us.",
            guildDocPath: "channels.botUpdatesChannelId",
            sectionPath: "",
            type: ChannelCategoryType.OTHER
        },
        {
            name: "Configure Logging Channel",
            description: "Here, you can add, modify, or remove logging channels. Various actions taken in the entire"
                + " guild (including sections) can be logged.",
            guildDocPath: "channels.loggingChannels",
            sectionPath: "",
            type: ChannelCategoryType.LOGGING
        },
        {
            name: "Configure Quota Channel",
            // TODO configquota command.
            description: "Here, you can add, modify, or remove quota channels. You are also able to configure quotas"
                + " through the `;configquota` command (and this might be more convenient).",
            guildDocPath: "channels.quotaLogsChannels",
            sectionPath: "",
            type: ChannelCategoryType.QUOTA
        }
    ];

    public constructor() {
        super({
            cmdCode: "CONFIGURE_CHANNEL_COMMAND",
            formalCommandName: "Configure Channel Command",
            botCommandNames: ["configchannels"],
            description: "Allows the user to configure channels for the entire server or for a specific section",
            usageGuide: ["configchannels"],
            exampleGuide: ["configchannels"],
            deleteCommandAfter: 0,
            commandCooldown: 10 * 1000,
            generalPermissions: ["MANAGE_GUILD"],
            rolePermissions: ["Officer", "HeadRaidLeader", "Moderator"],
            botPermissions: ["ADD_REACTIONS", "MANAGE_MESSAGES"],
            isRoleInclusive: false,
            guildOnly: true,
            botOwnerOnly: false,
            minArgs: 0
        });
    }

    public async run(msg: Message, args: string[], guildDoc: IGuildInfo): Promise<number> {
        if (!(msg.channel instanceof TextChannel)) return -1;
        this.entry(msg, guildDoc, null).then();
        return 0;
    }

    /** @inheritDoc */
    public async entry(msg: Message, guildDoc: IGuildInfo, botMsg: Message | null): Promise<void> {
        const member = FetchGetRequestUtilities.getCachedMember(msg.guild!, msg.author.id);
        if (!member) return;

        let selectedSection: ISectionInfo;
        let newBotMsg: Message;
        if (botMsg) {
            const queryResult = await InteractivityHelper.getSectionWithInitMsg(
                guildDoc,
                member,
                botMsg
            );
            if (!queryResult) return;
            newBotMsg = botMsg;
            selectedSection = queryResult;
        }
        else {
            const queryResult = await InteractivityHelper.getSectionQuery(
                guildDoc,
                msg.member!,
                msg.channel as TextChannel,
                "Please select the appropriate section that you want to change channel settings for.",
                true
            );
            if (!queryResult || !queryResult[1]) return;
            [selectedSection, newBotMsg] = queryResult;
        }

        this.mainMenu(msg, guildDoc, selectedSection, newBotMsg).then();
    }

    /** @inheritDoc */
    public async mainMenu(origMsg: Message, guildDoc: IGuildInfo, section: ISectionInfo,
                          botMsg: Message): Promise<void> {
        const guild = origMsg.guild!;
        // Both main section + individual section will have their own AFK check + verification channel config.
        const currentConfiguration = this.getCurrentConfiguration(
            guild,
            guildDoc,
            section,
            DisplayFilter.Verification | DisplayFilter.Raids | DisplayFilter.Other | DisplayFilter.Modmail
        );

        const displayEmbed = new MessageEmbed()
            .setAuthor(guild.name, guild.iconURL() ?? undefined)
            .setTitle(`[${section.sectionName}] **Channel** Configuration Main Menu`)
            .setDescription(`Please select the appropriate option.\n\n${currentConfiguration}`)
            .setFooter(`ID: ${section.uniqueIdentifier}`)
            .addField(
                "Go Back",
                "Click on the `Go Back` button to go back to the section selection embed. You can choose a new"
                + " section to modify."
            )
            .addField(
                "Edit Base Channels",
                "Click on the `Edit Base Channels` button to configure modmail, raid, and verification channels."
            )
            .addField(
                "Edit Expandable Channels",
                "Click on the `Edit Expandable Channels` button to add or remove channels like the quota leaderboard"
                + "  or logging channels."
            )
            .addField(
                "Edit Other Channels",
                "Click on the `Edit Other Channels` button to edit other channels that may not otherwise belong to"
                + " the above categories."
            )
            .addField(
                "Exit",
                "Click on the `Exit` button to exit this process."
            );

        // Edit the bot message and then wait for button press.
        await botMsg.edit({
            embeds: [displayEmbed],
            components: AdvancedCollector.getActionRowsFromComponents([
                new MessageButton()
                    .setLabel("Go Back")
                    .setStyle(MessageButtonStyles.PRIMARY)
                    .setCustomId("go_back")
                    .setEmoji(Emojis.LEFT_ARROW_EMOJI),
                new MessageButton()
                    .setLabel("Edit Base Channels")
                    .setStyle(MessageButtonStyles.PRIMARY)
                    .setCustomId("base")
                    .setEmoji(Emojis.HASH_EMOJI),
                new MessageButton()
                    .setLabel("Edit Expandable Channels")
                    .setStyle(MessageButtonStyles.PRIMARY)
                    .setCustomId("expandable")
                    .setEmoji(Emojis.HASH_EMOJI),
                new MessageButton()
                    .setLabel("Edit Other Channels")
                    .setStyle(MessageButtonStyles.PRIMARY)
                    .setCustomId("other")
                    .setEmoji(Emojis.HASH_EMOJI),
                new MessageButton()
                    .setLabel("Exit")
                    .setStyle(MessageButtonStyles.DANGER)
                    .setCustomId("exit")
                    .setEmoji(Emojis.X_EMOJI)
            ])
        });

        const selectedButton = await AdvancedCollector.startInteractionCollector({
            targetChannel: botMsg.channel as TextChannel,
            targetAuthor: botMsg.author,
            oldMsg: botMsg,
            acknowledgeImmediately: true,
            clearInteractionsAfterComplete: true,
            deleteBaseMsgAfterComplete: false,
            duration: 60 * 1000
        });

        if (!selectedButton) {
            await botMsg.delete();
            return;
        }

        switch (selectedButton.customId) {
            case "go_back": {
                this.entry(origMsg, guildDoc, botMsg).then();
                break;
            }
            case "base": {
                this.doBaseChannels(origMsg, guildDoc, section, botMsg).then();
                break;
            }
            case "expandable": {

                break;
            }
            case "other": {

                break;
            }
            case "exit": {
                await botMsg.delete();
                return;
            }
        }
    }

    /**
     * A function that lets the user choose to configure either AFK check channels or verification channels.
     * @param {Message} origMsg The original message.
     * @param {IGuildInfo} guildDoc The guild document.
     * @param {ISectionInfo} section The section to edit.
     * @param {Message} botMsg The bot message.
     * @private
     */
    private async doBaseChannels(origMsg: Message, guildDoc: IGuildInfo, section: ISectionInfo,
                                 botMsg: Message): Promise<void> {
        const guild = origMsg.guild!;
        const curConf = this.getCurrentConfiguration(
            guild,
            guildDoc,
            section,
            DisplayFilter.Verification | DisplayFilter.Raids | DisplayFilter.Modmail
        );

        // Corresponding buttons to display.
        const buttons: MessageButton[] = [
            new MessageButton()
                .setLabel("Go Back")
                .setStyle(MessageButtonStyles.PRIMARY)
                .setCustomId("go_back")
                .setEmoji(Emojis.LEFT_ARROW_EMOJI),
            new MessageButton()
                .setLabel("Raids")
                .setStyle(MessageButtonStyles.PRIMARY)
                .setCustomId("raids")
                .setEmoji(Emojis.HASH_EMOJI),
            new MessageButton()
                .setLabel("Verification")
                .setStyle(MessageButtonStyles.PRIMARY)
                .setCustomId("verification")
                .setEmoji(Emojis.HASH_EMOJI),
        ];


        const displayEmbed = new MessageEmbed()
            .setAuthor(guild.name, guild.iconURL() ?? undefined)
            .setTitle(`[${section.sectionName}] **Channel** Configuration ⇒ Base Channels`)
            .setDescription(`Select the button corresponding to the channel group you want to edit.\n\n${curConf}`)
            .setFooter(`ID: ${section.uniqueIdentifier}`)
            .addField(
                "Go Back",
                "Click on the `Go Back` button to go back to the main menu."
            )
            .addField(
                "Edit Raid Channels",
                "Click on the `Raids` button to configure the raids channels (this includes channels like the AFK"
                + " Check, Control Panel, and other channels)."
            )
            .addField(
                "Edit Verification Channels",
                "Click on the `Verification` button to configure the verification channels (this includes channels"
                + " like the Get Verified and Manual Verification channels)."
            );

        if (section.isMainSection) {
            displayEmbed.addField(
                "Edit Modmail Channels",
                "Click on the `Modmail` button to configure the modmail channels."
            );

            buttons.push(
                new MessageButton()
                    .setLabel("Modmail")
                    .setStyle(MessageButtonStyles.PRIMARY)
                    .setCustomId("modmail")
                    .setEmoji(Emojis.HASH_EMOJI)
            );
        }

        displayEmbed.addField(
            "Exit",
            "Click on the `Exit` button to exit this process."
        );

        buttons.push(
            new MessageButton()
                .setLabel("Exit")
                .setStyle(MessageButtonStyles.DANGER)
                .setCustomId("exit")
                .setEmoji(Emojis.X_EMOJI)
        );

        // Edit the bot message and then wait for button press.
        await botMsg.edit({
            embeds: [displayEmbed],
            components: AdvancedCollector.getActionRowsFromComponents(buttons)
        });

        const selectedButton = await AdvancedCollector.startInteractionCollector({
            targetChannel: botMsg.channel as TextChannel,
            targetAuthor: botMsg.author,
            oldMsg: botMsg,
            acknowledgeImmediately: true,
            clearInteractionsAfterComplete: true,
            deleteBaseMsgAfterComplete: false,
            duration: 60 * 1000
        });

        if (!selectedButton) {
            await botMsg.delete();
            return;
        }

        switch (selectedButton.customId) {
            case "go_back": {
                this.mainMenu(origMsg, guildDoc, section, botMsg).then();
                break;
            }
            case "raids": {

                break;
            }
            case "verification": {

                break;
            }
            case "modmail": {

                break;
            }
            case "exit": {
                await botMsg.delete();
                return;
            }
        }
    }

    /** @inheritDoc */
    public getCurrentConfiguration(guild: Guild, guildDoc: IGuildInfo, section: ISectionInfo,
                                    displayFilter: number): string {
        const currentConfiguration = new StringBuilder();
        if (displayFilter & DisplayFilter.Raids) {
            const raidChannelObj = section.channels.raids;
            const afkCheckChannel = getCachedChannel<TextChannel>(guild, raidChannelObj.afkCheckChannelId);
            const contPanelChannel = getCachedChannel<TextChannel>(guild, raidChannelObj.controlPanelChannelId);
            const rateLeaderChannel = getCachedChannel<TextChannel>(guild, raidChannelObj.rateLeaderChannel);

            currentConfiguration.append("__**Raid Channels**__").appendLine()
                .append(`⇒ AFK Check Channel: ${afkCheckChannel ?? this.NA}`).appendLine()
                .append(`⇒ Control Panel Channel: ${contPanelChannel ?? this.NA}`).appendLine()
                .append(`⇒ Rate Leader Channel: ${rateLeaderChannel ?? this.NA}`).appendLine()
                .appendLine();
        }

        if (displayFilter & DisplayFilter.Verification) {
            const verifChannelObj = section.channels.verification;
            const verifChannel = getCachedChannel<TextChannel>(guild, verifChannelObj.verificationChannelId);
            const manVerifChannel = getCachedChannel<TextChannel>(guild, verifChannelObj.manualVerificationChannelId);

            currentConfiguration.append("__**Verification Channels**__").appendLine()
                .append(`⇒ Verification Channel: ${verifChannel ?? this.NA}`).appendLine()
                .append(`⇒ Manual Verification Channel: ${manVerifChannel ?? this.NA}`).appendLine()
                .appendLine();
        }


        if (section.isMainSection) {
            if (displayFilter & DisplayFilter.Modmail) {
                const modmailChannels = guildDoc.channels.modmail;
                const mmChannel = getCachedChannel<TextChannel>(guild, modmailChannels.modmailChannelId);
                const mmStorageChannel = getCachedChannel<TextChannel>(guild, modmailChannels.modmailStorageChannelId);

                currentConfiguration.append("__**Modmail Channels**__").appendLine()
                    .append(`⇒ Modmail Channel: ${mmChannel ?? this.NA}`).appendLine()
                    .append(`⇒ Modmail Storage Channel: ${mmStorageChannel ?? this.NA}`).appendLine()
                    .appendLine();
            }

            if (displayFilter & DisplayFilter.Other) {
                const botUpdatesChan = getCachedChannel<TextChannel>(guild, guildDoc.channels.botUpdatesChannelId);
                currentConfiguration.append("__**Other Channels**__").appendLine()
                    .append(`⇒ Bot Updates Channel: ${botUpdatesChan ?? this.NA}`).appendLine();
            }
        }

        return currentConfiguration.toString().trim();
    }
}