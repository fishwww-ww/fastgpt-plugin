import { defineToolSet } from '@tool/type';
import { ToolTypeEnum } from '@tool/type/tool';

export default defineToolSet({
  name: {
    'zh-CN': '墨迹天气',
    en: 'Moji Weather'
  },
  type: ToolTypeEnum.tools,
  description: {
    'zh-CN': '墨迹天气工具集，提供天气查询相关功能',
    en: 'Moji Weather toolset providing weather query functionality'
  },
  toolDescription:
    'tool description for ai to use, fallback to English description if not provided',
  icon: '/imgs/tools/mojiWeather.svg'
});
