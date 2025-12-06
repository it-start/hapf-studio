import { Cloud, Wind, Hexagon, Shield, Server, Wifi } from 'lucide-react';
import { AIProvider } from '../types';

export const PROVIDER_THEMES = {
  [AIProvider.GOOGLE]: {
    label: 'GEMINI',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    borderColor: '#3b82f6',
    Icon: Cloud
  },
  [AIProvider.MISTRAL]: {
    label: 'MISTRAL',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20',
    borderColor: '#f97316',
    Icon: Wind
  },
  [AIProvider.COHERE]: {
    label: 'COHERE',
    colorClass: 'text-teal-400',
    bgClass: 'bg-teal-500/10',
    borderClass: 'border-teal-500/20',
    borderColor: '#14b8a6',
    Icon: Hexagon
  },
  [AIProvider.UNKNOWN]: {
    label: 'UNKNOWN',
    colorClass: 'text-hapf-muted',
    bgClass: 'bg-hapf-border',
    borderClass: 'border-hapf-border',
    borderColor: '#52525b',
    Icon: Cloud
  }
};

export const getProviderTheme = (provider: AIProvider) => {
  return PROVIDER_THEMES[provider] || PROVIDER_THEMES[AIProvider.UNKNOWN];
};

export const detectProviderFromText = (text: string): AIProvider | null => {
    const t = text.toLowerCase();
    if (t.includes('mistral')) return AIProvider.MISTRAL;
    if (t.includes('cohere') || t.includes('command')) return AIProvider.COHERE;
    if (t.includes('gemini') || t.includes('google')) return AIProvider.GOOGLE;
    return null;
};

export const getLogCategory = (message: string) => {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('[sec]') || lowerMsg.includes('mtls') || lowerMsg.includes('cert')) {
      return { Icon: Shield, colorClass: "text-hapf-success" };
  }
  if (lowerMsg.includes('[edge]') || lowerMsg.includes('cache')) {
      return { Icon: Server, colorClass: "text-orange-400" };
  }
  if (lowerMsg.includes('[net]') || lowerMsg.includes('handshake')) {
      return { Icon: Wifi, colorClass: "text-blue-400" };
  }
  return null;
};
