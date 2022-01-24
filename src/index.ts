import {Bot} from "./Bot";
import {IConfiguration} from "./definitions";
import * as fs from "fs";
import * as path from "path";
import {StringBuilder} from "./utilities/StringBuilder";
import {TimeUtilities} from "./utilities/TimeUtilities";
import {DUNGEON_DATA} from "./constants/dungeons/DungeonData";
import {MAPPED_AFK_CHECK_REACTIONS} from "./constants/dungeons/MappedAfkCheckReactions";

(async () => {
    const allEmojis = DUNGEON_DATA.flatMap(x => x.keyReactions.concat(x.otherReactions));
    for (const {mapKey} of allEmojis) {
        if (mapKey in MAPPED_AFK_CHECK_REACTIONS) {
            continue;
        }

        console.error(`[!] ${mapKey} not valid`);
    }

    const content = fs.readFileSync(path.join(__dirname, "..", "config.production.json"));
    const config: IConfiguration = JSON.parse(content.toString());
    const bot = new Bot(config);
    bot.startAllEvents();
    await bot.login();
    bot.initServices();
})();

process.on("unhandledRejection", e => {
    console.error(
        new StringBuilder()
            .append(`[${TimeUtilities.getDateTime(Date.now(), "America/Los_Angeles")}] ${e}`)
            .appendLine()
            .append("=====================================")
            .toString()
    );
});

process.on("uncaughtException", e => {
    console.error(
        new StringBuilder()
            .append(`[${TimeUtilities.getDateTime(Date.now(), "America/Los_Angeles")}] ${e.name}`)
            .appendLine()
            .append(e.message)
            .appendLine(2)
            .append(e.stack)
            .appendLine()
            .append("=====================================")
            .toString()
    );
    process.exit(1);
});

// Hijack console.info so it has date.
const l = console.info;
console.info = function (...args) {
    const date = `[${TimeUtilities.getDateTime(Date.now(), "America/Los_Angeles")}]`;
    l.apply(this, [date, ...args, "\n"]);
};