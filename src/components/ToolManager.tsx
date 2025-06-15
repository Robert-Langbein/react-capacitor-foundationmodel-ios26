import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCalculator, faLightbulb, faCheck } from '@fortawesome/free-solid-svg-icons';
import { foundationModels } from '../services/foundation.models.service';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  handler: (input: string) => Promise<string> | string;
}

interface ToolManagerProps {
  onToolsRegistered: (toolIds: string[]) => void;
  selectedTools: string[];
  onToolSelectionChange: (toolIds: string[]) => void;
}

const availableTools: Tool[] = [
  {
    id: 'datetime_tool',
    name: 'Current Time',
    description: 'Returns the current date and time',
    icon: faClock,
    color: 'bg-blue-500',
    handler: () => {
      const now = new Date();
      return `Current date and time: ${now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })} at ${now.toLocaleTimeString('en-US')}`;
    }
  },
  {
    id: 'calculator_tool',
    name: 'Calculator',
    description: 'Performs mathematical calculations',
    icon: faCalculator,
    color: 'bg-green-500',
    handler: (input: string) => {
      try {
        // Simple calculator - only safe mathematical operations
        const sanitized = input.replace(/[^0-9+\-*/().\s]/g, '');
        if (!sanitized.trim()) {
          return 'Please enter a valid mathematical calculation.';
        }
        
        // Use Function constructor for safe evaluation
        const result = Function(`"use strict"; return (${sanitized})`)();
        
        if (typeof result === 'number' && !isNaN(result)) {
          return `Result: ${result}`;
        } else {
          return 'Invalid calculation.';
        }
      } catch (error) {
        return 'Error in calculation. Please check your input.';
      }
    }
  },
  {
    id: 'random_fact_tool',
    name: 'Random Fact',
    description: 'Generates an interesting random fact',
    icon: faLightbulb,
    color: 'bg-purple-500',
    handler: () => {
      const facts = [
        'Honey never spoils. Archaeologists have found 3000-year-old honey that was still edible.',
        'An octopus has three hearts and blue blood.',
        'Bananas are botanically berries, but strawberries are not.',
        'A day on Venus is longer than a year on Venus.',
        'Flamingos are only pink because they eat shrimp.',
        'Lightning is five times hotter than the surface of the sun.',
        'Dolphins have names for each other - they use unique whistle sounds.',
        'A teaspoon of neutron star would weigh about 6 billion tons.'
      ];
      
      const randomFact = facts[Math.floor(Math.random() * facts.length)];
      return `🎯 Interesting fact: ${randomFact}`;
    }
  }
];

const ToolManager: React.FC<ToolManagerProps> = ({
  onToolsRegistered,
  selectedTools,
  onToolSelectionChange
}) => {
  const [registeredTools, setRegisteredTools] = useState<string[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    registerSelectedTools();
  }, [selectedTools]);

  const registerSelectedTools = async () => {
    if (selectedTools.length === 0) {
      setRegisteredTools([]);
      onToolsRegistered([]);
      return;
    }

    setIsRegistering(true);
    try {
      const newRegisteredTools: string[] = [];
      
      for (const toolId of selectedTools) {
        const tool = availableTools.find(t => t.id === toolId);
        if (tool) {
          // Register the tool in Foundation Models Service
          await foundationModels.registerTool({
            toolId: tool.id,
            name: tool.name,
            description: tool.description
          });
          
          newRegisteredTools.push(tool.id);
        }
      }
      
      setRegisteredTools(newRegisteredTools);
      onToolsRegistered(newRegisteredTools);
    } catch (error) {
      console.error('Failed to register tools:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const toggleTool = (toolId: string) => {
    const newSelection = selectedTools.includes(toolId)
      ? selectedTools.filter(id => id !== toolId)
      : [...selectedTools, toolId];
    
    onToolSelectionChange(newSelection);
  };

//   const executeToolLocally = async (toolId: string, input: string = ''): Promise<string> => {
//     const tool = availableTools.find(t => t.id === toolId);
//     if (!tool) {
//       return 'Tool not found.';
//     }
    
//     try {
//       const result = await tool.handler(input);
//       return result;
//     } catch (error) {
//       return `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
//     }
//   };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Select Tools ({availableTools.length} available)</h3>
        {isRegistering && (
          <div className="text-xs text-white/60">Registering...</div>
        )}
      </div>
      
      <div className="space-y-2">
        {availableTools.map((tool) => {
          const isSelected = selectedTools.includes(tool.id);
          const isRegistered = registeredTools.includes(tool.id);
          
          return (
            <motion.div
              key={tool.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'bg-white/15 border border-white/30' 
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
              onClick={() => toggleTool(tool.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${tool.color}`}>
                  <FontAwesomeIcon icon={tool.icon} className="text-white text-sm" />
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{tool.name}</div>
                  <div className="text-white/60 text-xs">{tool.description}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isRegistered && (
                  <FontAwesomeIcon icon={faCheck} className="text-green-400 text-xs" />
                )}
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  isSelected 
                    ? 'bg-purple-500 border-purple-500' 
                    : 'border-white/30'
                }`}>
                  {isSelected && (
                    <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {selectedTools.length > 0 && (
        <div className="text-xs text-white/60 text-center">
          {selectedTools.length} of {availableTools.length} tools selected
        </div>
      )}
    </div>
  );
};

// Export the tool execution function for use in ChatApp
export const executeToolById = async (toolId: string, input: string = ''): Promise<string> => {
  const tool = availableTools.find(t => t.id === toolId);
  if (!tool) {
    return 'Tool not found.';
  }
  
  try {
    const result = await tool.handler(input);
    return result;
  } catch (error) {
    return `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export default ToolManager; 