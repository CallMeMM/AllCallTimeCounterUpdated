/**
 * @name AllCallTimeCounter
 * @author Max
 * @authorLink https://github.com/Max-Herbold
 * @version 1.1.5.1
 * @description Add call timer to all users in a server voice channel.
 * @website https://github.com/CallMeMM/AllCallTimeCounterUpdated/tree/main/AllCallTimeCounter-Updated
 * @source https://github.com/CallMeMM/AllCallTimeCounterUpdated/blob/main/AllCallTimeCounter-Updated/AllCallTimeCounter-Updated.plugin.js
 * @updateUrl https://raw.githubusercontent.com/CallMeMM/AllCallTimeCounterUpdated/main/AllCallTimeCounter-Updated/AllCallTimeCounter-Updated.plugin.js
 */

module.exports = (_ => {
    class Timer extends window.BdApi.React.Component {
        constructor(props) {
            super(props);
            this.state = { time_delta: Date.now() - this.props.time };
        }

        render() {
            let time = new Date(Date.now() - this.props.time).toISOString().substr(11, 8);
            return window.BdApi.React.createElement("div", {
                className: "timeCounter",
                children: time,
                style: {
                    position: "relative",
                    marginTop: -0,
                    fontWeight: "bold",
                    fontFamily: "'Helvetica Neue', Arial, sans-serif", // Updated font for better readability
                    fontSize: 10,         // Font size
                    color: "var(--channels-default)",
                    padding: "0px 6px",   // Adjusted padding for a smaller outline
                    borderRadius: "6px",   // Rounded corners for aesthetic appeal
                    backgroundColor: "rgba(0, 0, 0, 0.5)", // Transparent background
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.5)", // Subtle shadow for depth
                    maxWidth: "60px",      // Limit the width to prevent overlap
                    overflow: "hidden",     // Hide any overflow
                    whiteSpace: "nowrap",   // Prevent text wrapping
                    textOverflow: "ellipsis" // Show ellipsis for long text
                }
            });
        }

        componentDidMount() {
            this.interval = setInterval(() => this.setState({ time: Date.now() }), 1000);
        }

        componentWillUnmount() {
            clearInterval(this.interval);
        }
    }

    const showChangelog = () => {
        const changelog = `
**Coming Soon: \`AllCallTimeCounter\`**

- Customize the background color
- Adjust the transparency of the background
- Toggle the background on and off!
- Improved background and timer size!
        `;

        // Using an alert for simplicity; consider creating a modal for a better UX
        window.BdApi.alert("⚠️ Upcoming Features", changelog);
    };

    return class AllCallTimeCounter {
        users = new Map();  // value format: [channelId, lastUpdatedTime]

        load() {
            // Call the changelog function when the plugin is loaded
            showChangelog();
        }

        allUsers(guilds) {
            let users = [];
            for (const guildId in guilds) {
                const guild = guilds[guildId];
                for (const userId in guild) {
                    users.push(userId);
                }
            }
            return users;
        }

        updateInternal(userId, channelId) {
            this.users.set(userId, [channelId, Date.now()]);
        }

        updateSingleUser(userId, channelId) {
            if (!channelId) {
                return;
            }
            if (this.users.has(userId) && this.users.get(userId)[0] !== channelId) {
                this.updateInternal(userId, channelId);
            } else if (!this.users.has(userId)) {
                this.updateInternal(userId, channelId);
            }
        }

        runEverySecond() {
            const states = this.VoiceStateStore.getAllVoiceStates();
            const current_users = this.allUsers(states);
            for (let userId of Array.from(this.users.keys())) {
                if (!current_users.includes(userId)) {
                    this.users.delete(userId);
                }
            }

            for (const guildId in states) {
                let guild = states[guildId];
                for (const userId in guild) {
                    const user = guild[userId];
                    const { channelId } = user;
                    if (channelId) {
                        if (this.users.has(userId)) {
                            if (this.users.get(userId)[0] !== channelId) {
                                this.updateInternal(userId, channelId);
                            }
                        } else {
                            this.updateInternal(userId, channelId);
                        }
                    }
                }
            }
        }

        start() {
            const searchProps = ["renderPrioritySpeaker", "renderIcons", "renderAvatar"];
            const VoiceUser = window.BdApi.Webpack.getAllByPrototypeKeys(...searchProps)[0];

            this.VoiceStateStore = window.BdApi.Webpack.getStore("VoiceStateStore");

            window.BdApi.Patcher.after("AllCallTimeCounter", VoiceUser.prototype, "render", (e, _, returnValue) => this.processVoiceUser(e, _, returnValue));

            this.interval = setInterval(() => this.runEverySecond(), 1000);
        }

        stop() {
            window.BdApi.Patcher.unpatchAll("AllCallTimeCounter");
            clearInterval(this.interval);
        }

        createUserTimer(user, parent) {
            const time = this.users.get(user.id)[1];
            const tag = window.BdApi.React.createElement(Timer, { time: time });

            try {
                parent[2].props.children.props.children.props.children.push(tag);
            } catch (e) { }
        }

        processVoiceUser(e, _, returnValue) {
            const { user } = e.props;
            this.updateSingleUser(user.id, e.props.channelId);
            const parent = returnValue.props.children.props.children;
            this.createUserTimer(user, parent);
        }
    };
})();
