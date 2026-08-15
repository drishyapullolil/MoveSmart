const mongoose = require("mongoose");

const monitoringConfigSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      default: "default_fleet_config",
      unique: true,
    },
    // Drowsiness EAR thresholds
    earThreshold: {
      type: Number,
      default: 0.22, // EAR below this is considered eye closed
      min: 0.1,
      max: 0.4,
    },
    earlyWarningDurationSec: {
      type: Number,
      default: 1.5, // 1.5s closure -> early warning
    },
    drowsinessDurationSec: {
      type: Number,
      default: 2.5, // 2.5s closure -> drowsiness warning
    },
    criticalDrowsinessDurationSec: {
      type: Number,
      default: 4.0, // 4.0s closure -> critical drowsiness alert
    },
    // Driver absence grace periods
    driverAbsenceGraceSec: {
      type: Number,
      default: 15, // 0-15s monitoring/grace, 15s+ absence warning
    },
    driverAbsenceCriticalSec: {
      type: Number,
      default: 30, // 30s+ absence -> critical admin alert
    },
    // Face verification & mismatch
    faceMatchConfidenceThreshold: {
      type: Number,
      default: 0.75, // 75%+ match confidence
      min: 0.3,
      max: 1.0,
    },
    // Device connection & offline detection
    heartbeatIntervalSec: {
      type: Number,
      default: 5,
    },
    deviceOfflineTimeoutSec: {
      type: Number,
      default: 20, // If no heartbeat in 20s -> device offline
    },
    // Alert escalation & notification settings
    alertEscalationTimeSec: {
      type: Number,
      default: 60, // Unacknowledged alert escalates
    },
    audioAlertsEnabled: {
      type: Boolean,
      default: true,
    },
    voicePromptsEnabled: {
      type: Boolean,
      default: true,
    },
    voicePromptTextEarly: {
      type: String,
      default: "Please stay alert.",
    },
    voicePromptTextDrowsy: {
      type: String,
      default: "Please stay alert. Consider drinking some water.",
    },
    voicePromptTextCritical: {
      type: String,
      default: "Critical drowsiness detected. Please pull over safely if needed.",
    },
  },
  { timestamps: true }
);

// Static helper to get or initialize singleton default configuration
monitoringConfigSchema.statics.getActiveConfig = async function () {
  let config = await this.findOne({ configKey: "default_fleet_config" });
  if (!config) {
    config = await this.create({ configKey: "default_fleet_config" });
  }
  return config;
};

module.exports = mongoose.model("MonitoringConfig", monitoringConfigSchema);
