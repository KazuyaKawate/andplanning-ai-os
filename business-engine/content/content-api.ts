import { ContentService } from './content-service';

/**
 * Content Manager API
 */
export const getContentEntries = async () => {
  const service = ContentService.getInstance();
  return {
    ok: true,
    data: service.getEntries()
  };
};

/**
 * SNS最適化を実行する
 */
export const optimizeContentAction = async (id: string) => {
  const service = ContentService.getInstance();
  service.getManager().optimizeForPlatforms(id);
  
  return {
    ok: true,
    data: service.getManager().getEntryById(id)
  };
};

/**
 * 将来のAIライター連携用プレースホルダー
 */
export const generateAiContent = async (prompt: string) => {
  return {
    ok: true,
    message: "AI Content generation requested",
    prompt
  };
};
