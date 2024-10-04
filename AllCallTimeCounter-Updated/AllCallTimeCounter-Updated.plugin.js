/**
 * @name AllCallTimeCounter-Updated
 * @author Author: Max, Modded by: CallMeM
 * @authorLink https://github.com/Max-Herbold/AllCallTimersDiscordPlugin
 * @version 1.0.1
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
        
            const currentVersion = "1.0.1"; // Set the current version
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
**New Features:**

- Added **Text Color** option to customize the timer text color.
- Fixed Settings Menu.

**Known Bugs:**

- None.
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
            const panel = this.createPanel();
            
            // Toggle Switches
            this.createToggleSwitch(panel, "Always Show Timer:", this.settings.alwaysShowTimer, () => {
                this.toggleAlwaysShowTimer();
            });
        
            // Color Settings
            this.createColorSetting(panel, "Background Color:", this.settings.bgColor, (value) => {
                this.updateBgColor(value);
            });
        
            this.createColorSetting(panel, "Text Color:", this.settings.textColor, (value) => {
                this.updateTextColor(value);
            });
        
            // Range Settings
            this.createRangeSetting(panel, "Background Opacity:", this.settings.bgOpacity, 0, 1, 0.01, (value) => {
                this.updateBgOpacity(value);
            });
        
            return panel;
        }
        
        createPanel() {
            const panel = document.createElement("div");
            panel.style.padding = "20px"; // Increased padding for better spacing
            panel.style.backgroundColor = "#2f3136"; // Discord's background color
            panel.style.borderRadius = "8px"; // Rounded corners
            panel.style.color = "var(--text-normal)"; // Text color for better contrast
            panel.style.fontFamily = "Avenir, Helvetica, sans-serif"; // Modern font
            return panel;
        }
        
        // Toggle Switch Helper
        createToggleSwitch(panel, labelText, isChecked, onChange) {
            const toggleContainer = document.createElement("div");
            toggleContainer.className = "setting";
            toggleContainer.style.display = "flex";
            toggleContainer.style.alignItems = "center";
            toggleContainer.style.marginBottom = "15px"; // Spacing between settings
        
            const label = this.createLabel(labelText);
            const toggleInput = this.createToggleInput(isChecked);
            const toggleSwitch = this.createToggleSwitchElement(isChecked, toggleInput);
        
            toggleContainer.append(label, toggleSwitch);
            panel.appendChild(toggleContainer);
        
            toggleSwitch.addEventListener("click", () => {
                toggleInput.checked = !toggleInput.checked; // Toggle the checkbox
                onChange(); // Call the provided onChange function
                this.updateToggleSwitchAppearance(toggleSwitch, toggleInput.checked);
            });
        }
        
        // Create Label Helper
        createLabel(text) {
            const label = document.createElement("span");
            label.textContent = text;
            label.style.marginRight = "10px"; // Spacing between label and toggle
            return label;
        }
        
        // Create Toggle Input Helper
        createToggleInput(isChecked) {
            const toggleInput = document.createElement("input");
            toggleInput.type = "checkbox";
            toggleInput.checked = isChecked;
            toggleInput.style.display = "none"; // Hide the default checkbox
            return toggleInput;
        }
        
        // Create Toggle Switch Element Helper
        createToggleSwitchElement(isChecked, toggleInput) {
            const toggleSwitch = document.createElement("div");
            toggleSwitch.className = "toggle-switch";
            toggleSwitch.style.width = "40px";
            toggleSwitch.style.height = "20px";
            toggleSwitch.style.borderRadius = "12px";
            toggleSwitch.style.position = "relative";
            toggleSwitch.style.backgroundColor = isChecked ? "#43b581" : "#8e9297"; // Toggle color
            toggleSwitch.style.cursor = "pointer";
            toggleSwitch.style.transition = "background 0.2s";
        
            const toggleCircle = document.createElement("div");
            toggleCircle.style.position = "absolute";
            toggleCircle.style.top = "2px";
            toggleCircle.style.left = isChecked ? "20px" : "2px";
            toggleCircle.style.width = "16px";
            toggleCircle.style.height = "16px";
            toggleCircle.style.borderRadius = "50%";
            toggleCircle.style.backgroundColor = "#ffffff";
            toggleCircle.style.transition = "left 0.2s";
        
            toggleSwitch.appendChild(toggleCircle);
            return toggleSwitch;
        }
        
        // Update Toggle Switch Appearance Helper
        updateToggleSwitchAppearance(toggleSwitch, isChecked) {
            toggleSwitch.style.backgroundColor = isChecked ? "#43b581" : "#8e9297"; // Update color
            toggleSwitch.lastChild.style.left = isChecked ? "20px" : "2px"; // Move the circle
        }
        
        // Color Setting Helper
        createColorSetting(panel, labelText, initialColor, onChange) {
            const colorSetting = document.createElement("div");
            colorSetting.className = "setting";
        
            const label = this.createLabel(labelText);
            const colorInput = document.createElement("input");
            colorInput.type = "color";
            colorInput.value = initialColor;
        
            colorInput.addEventListener("input", () => {
                onChange(colorInput.value);
            });
        
            colorSetting.append(label, colorInput);
            panel.appendChild(colorSetting);
        }
        
        // Range Setting Helper
        createRangeSetting(panel, labelText, initialValue, min, max, step, onChange) {
            const rangeSetting = document.createElement("div");
            rangeSetting.className = "setting";
        
            const label = this.createLabel(labelText);
            const rangeInput = document.createElement("input");
            rangeInput.type = "range";
            rangeInput.min = min;
            rangeInput.max = max;
            rangeInput.step = step;
            rangeInput.value = initialValue;
        
            rangeInput.addEventListener("input", () => {
                onChange(parseFloat(rangeInput.value));
            });
        
            rangeSetting.append(label, rangeInput);
            panel.appendChild(rangeSetting);
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
