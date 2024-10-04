/**
 * @name AllCallTimeCounter
 * @author Max
 * @authorLink https://github.com/Max-Herbold/AllCallTimersDiscordPlugin
 * @version 1.1.5.4
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
                    fontFamily: this.props.font,
                    fontSize: 10,
                    color: this.props.textColor,  // Set text color from props
                    padding: "0px 6px",
                    borderRadius: "6px",
                    backgroundColor: this.props.bgColor,
                    opacity: this.props.bgOpacity,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
                    width: "44px",      // Set a fixed width for the timer box
                    overflow: "hidden",  // Hide any overflow
                    whiteSpace: "nowrap", // Prevent text wrapping
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
    
    return class AllCallTimeCounter {
        constructor() {
            this.settings = {
                alwaysShowTimer: true,
                bgColor: "rgba(0, 0, 0, 0.5)",
                bgOpacity: 0.5,
                textColor: "var(--channels-default)", // Add text color setting
            };
        }

        users = new Map();  // value format: [channelId, lastUpdatedTime]

        load() {
            this.loadSettings();
        
            const currentVersion = "1.1.5.4"; // Set the current version
            const savedVersion = window.BdApi.loadData("AllCallTimeCounter", "version");
        
            if (savedVersion !== currentVersion) {
                // Show the changelog only if the version has changed
                window.BdApi.showToast("AllCallTimeCounter has been updated to version " + currentVersion + ". Check the changelog for new features!", {type: "info", timeout: 5000});
        
                // Save the current version to prevent the changelog from showing again
                window.BdApi.saveData("AllCallTimeCounter", "version", currentVersion);
        
                // Add your changelog message here
                this.showChangelog();
            }
        }
        
        showChangelog() {
            window.BdApi.alert("AllCallTimeCounter Change Log", `
- **New Features:**
  - Added **Text Color** option to customize the timer text color.

---

- **Known Bugs:**
  - **Settings Menu Issue:** Changes in the settings do not reflect immediately. You’ll need to close and reopen the settings menu for the modifications to show up.
            `);
        }        

        loadSettings() {
            const savedSettings = window.BdApi.loadData("AllCallTimeCounter", "settings");
            if (savedSettings) {
                this.settings = savedSettings;
            }
        }

        saveSettings() {
            window.BdApi.saveData("AllCallTimeCounter", "settings", this.settings);
        }

        toggleAlwaysShowTimer() {
            this.settings.alwaysShowTimer = !this.settings.alwaysShowTimer;
            this.saveSettings();
        }

        updateBgColor(newColor) {
            this.settings.bgColor = newColor;
            this.saveSettings();
        }

        updateBgOpacity(newOpacity) {
            this.settings.bgOpacity = newOpacity;
            this.saveSettings();
        }

        updateTextColor(newColor) {  // New method to update text color
            this.settings.textColor = newColor;
            this.saveSettings();
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
            const tag = window.BdApi.React.createElement(Timer, {
                time: time,
                bgColor: this.settings.bgColor,
                bgOpacity: this.settings.bgOpacity,
                textColor: this.settings.textColor  // Pass text color to Timer
            });

            try {
                parent[2].props.children.props.children.props.children.push(tag);
            } catch (e) { }
        }

        processVoiceUser(e, _, returnValue) {
            const { user } = e.props;
            this.updateSingleUser(user.id, e.props.channelId);
            const parent = returnValue.props.children.props.children;
            if (this.settings.alwaysShowTimer) {
                this.createUserTimer(user, parent);
            }
        }

        getSettingsPanel() {
            const toggleStyle = {
                display: 'inline-block',
                width: '34px',
                height: '20px',
                background: this.settings.alwaysShowTimer ? '#43b581' : '#8e9297',
                borderRadius: '20px',
                position: 'relative',
                cursor: 'pointer',
                marginBottom: '10px'
            };
        
            const toggleBallStyle = {
                position: 'absolute',
                top: '2px',
                left: this.settings.alwaysShowTimer ? '16px' : '2px',
                width: '16px',
                height: '16px',
                background: '#ffffff',
                borderRadius: '50%',
                transition: 'left 0.2s'
            };
        
            const settingsPanel = window.BdApi.React.createElement("div", {
                style: {
                    padding: "20px",
                    backgroundColor: "#2f3136",
                    borderRadius: "8px",
                    boxShadow: "0 0 6px rgba(0, 0, 0, 0.5)",
                },
                children: [
                    window.BdApi.React.createElement("h3", {
                        style: {
                            color: "var(--header-primary)",
                            fontSize: "16px",
                            margin: "0 0 10px 0"
                        },
                        children: "All Call Time Counter Settings"
                    }),
                    window.BdApi.React.createElement("label", {
                        style: { display: 'block', color: "var(--text-normal)", fontSize: "14px", marginBottom: "5px" },
                        children: [
                            window.BdApi.React.createElement("div", {
                                style: toggleStyle,
                                onClick: () => this.toggleAlwaysShowTimer()
                            }, [
                                window.BdApi.React.createElement("div", { style: toggleBallStyle })
                            ]),
                            " Always Show Timer"
                        ]
                    }),
                    window.BdApi.React.createElement("div", {
                        style: { marginTop: "10px", color: "var(--text-normal)" },
                        children: [
                            window.BdApi.React.createElement("label", {
                                style: { display: 'block', fontSize: "14px", margin: "10px 0 5px 0" },
                                children: "Background Color:"
                            }),
                            window.BdApi.React.createElement("input", {
                                type: "color",
                                value: this.settings.bgColor,
                                onChange: (e) => this.updateBgColor(e.target.value),
                                style: { width: "100%", marginTop: "5px", border: "none" }
                            }),
                            window.BdApi.React.createElement("label", {
                                style: { display: 'block', fontSize: "14px", margin: "10px 0 5px 0" },
                                children: "Background Transparency:"
                            }),
                            window.BdApi.React.createElement("input", {
                                type: "range",
                                min: 0,
                                max: 1,
                                step: 0.01,
                                value: this.settings.bgOpacity,
                                onChange: (e) => this.updateBgOpacity(e.target.value),
                                style: { width: "100%", marginTop: "5px", border: "none" }
                            }),
                            // Add Text Color section
                            window.BdApi.React.createElement("label", {
                                style: { display: 'block', fontSize: "14px", margin: "10px 0 5px 0" },
                                children: "Text Color:"
                            }),
                            window.BdApi.React.createElement("input", {
                                type: "color",
                                value: this.settings.textColor,
                                onChange: (e) => this.updateTextColor(e.target.value),
                                style: { width: "100%", marginTop: "5px", border: "none" }
                            }),
                        ]
                    })
                ]
            });
        
            return settingsPanel;
        }        

        onStart() {
            this.load();
            this.start();
        }

        onStop() {
            this.stop();
        }
    };
})();
