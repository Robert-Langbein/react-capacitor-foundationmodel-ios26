import React from 'react';
import { motion } from 'framer-motion';
import { Slider } from './ui/slider';
import { Textarea } from './ui/textarea';

interface Settings {
  temperature: number;
  maxTokens: number;
  enableStreaming: boolean;
  enableInstructions: boolean;
}

interface SettingsPanelProps {
  settings: Settings;
  instructions: string;
  onSettingsChange: (settings: Settings) => void;
  onInstructionsChange: (instructions: string) => void;
  currentScenario?: string;
  jsonSchema?: string;
  onJsonSchemaChange?: (schema: string) => void;
  toolManagerComponent?: React.ReactNode;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  instructions,
  onSettingsChange,
  onInstructionsChange,
  currentScenario,
  jsonSchema,
  onJsonSchemaChange,
  toolManagerComponent
}) => {
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <label className="block text-white/80 text-sm font-medium">
            Temperature: {settings.temperature.toFixed(1)}
          </label>
          <Slider
            value={[settings.temperature]}
            onValueChange={([value]) => updateSetting('temperature', value)}
            max={1}
            min={0}
            step={0.1}
            className="w-full"
          />
          <p className="text-xs text-white/60">
            Controls response creativity
          </p>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <label className="block text-white/80 text-sm font-medium">
            Max Tokens: {settings.maxTokens}
          </label>
          <Slider
            value={[settings.maxTokens]}
            onValueChange={([value]) => updateSetting('maxTokens', value)}
            max={4000}
            min={100}
            step={100}
            className="w-full"
          />
          <p className="text-xs text-white/60">
            Maximum response length
          </p>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.enableStreaming}
              onChange={(e) => updateSetting('enableStreaming', e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-white/80 text-sm">Enable Streaming</span>
          </label>
          <p className="text-xs text-white/60">
            Show responses in real-time
          </p>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.enableInstructions}
              onChange={(e) => updateSetting('enableInstructions', e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-white/80 text-sm">System Instructions</span>
          </label>
          <p className="text-xs text-white/60">
            Additional instructions for the model
          </p>
        </motion.div>
      </div>

      {settings.enableInstructions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <label className="block text-white/80 text-sm font-medium">
            System Instructions
          </label>
          <Textarea
            value={instructions}
            onChange={(e) => onInstructionsChange(e.target.value)}
            placeholder="Enter system instructions here..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
          />
          <p className="text-xs text-white/60">
            These instructions will be considered with every request
          </p>
        </motion.div>
      )}

      {/* Scenario-specific settings */}
      {currentScenario === 'structured' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <label className="block text-white/80 text-sm font-medium">
            JSON Schema
          </label>
          <Textarea
            value={jsonSchema || ''}
            onChange={(e) => onJsonSchemaChange?.(e.target.value)}
            placeholder="Enter JSON schema..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 font-mono text-sm min-h-[120px]"
          />
          <p className="text-xs text-white/60">
            Define the structure for structured output generation
          </p>
        </motion.div>
      )}
      
      {currentScenario === 'tools' && toolManagerComponent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          {toolManagerComponent}
        </motion.div>
      )}
    </div>
  );
};

export default SettingsPanel; 