import { z } from 'zod';
import { POST, GET } from '@tool/utils/request';
import { uploadFile } from '@tool/utils/uploadFile';

export const InputType = z.object({
  apiKey: z.string(),
  text: z.string().nonempty(),
  model: z.string().nonempty(),
  voice_setting: z.object({
    voice_id: z.string(),
    speed: z.number(),
    vol: z.number(),
    pitch: z.number(),
    emotion: z.string(),
    en_normalization: z.boolean()
  })
});

export const OutputType = z.object({
  audioUrl: z.string()
});

const MINIMAX_BASE_URL = 'https://api.minimaxi.com/v1';

export async function tool({
  apiKey,
  text,
  model,
  voice_setting
}: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  const { voice_id, speed, vol, pitch, emotion, en_normalization } = voice_setting;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  // these params are advanced settings, now not allow user to customize
  const defaultSetting = {
    pronunciation_dict: {
      tone: []
    },
    audio_setting: {
      audio_sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
      channel: 2
    },
    voice_modify: {
      pitch: 0,
      intensity: 0,
      timbre: 0,
      sound_effects: 'spacious_echo'
    }
  };

  try {
    // create tts task
    const { data: taskData } = await POST(
      `${MINIMAX_BASE_URL}/t2a_async_v2`,
      {
        model,
        text,
        language_boost: 'auto',
        voice_setting: {
          voice_id,
          speed,
          vol,
          pitch,
          emotion,
          en_normalization
        },
        ...defaultSetting
      },
      {
        headers
      }
    );

    const task_id = taskData.task_id;
    // polling task status until success or failed
    // file can be downloaded when task status is success
    const pollTaskStatus = async () => {
      const maxRetries = 180;
      for (let i = 0; i < maxRetries; i++) {
        const { data: statusData } = await GET(`${MINIMAX_BASE_URL}/query/t2a_async_query_v2`, {
          params: { task_id },
          headers
        });
        const status = statusData.status;
        if (status === 'Success') {
          return statusData.file_id;
        }
        if (status === 'Failed') {
          throw new Error('TTS task failed');
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw new Error('TTS task timeout');
    };
    const file_id = await pollTaskStatus();

    // retrieve file content
    const { data: fileBuffer } = await GET(`${MINIMAX_BASE_URL}/files/retrieve_content`, {
      params: { file_id },
      headers,
      responseType: 'arrayBuffer'
    });

    const { accessUrl: audioUrl } = await uploadFile({
      buffer: Buffer.from(fileBuffer),
      defaultFilename: 'minimax_tts.mp3'
    });

    return { audioUrl };
  } catch (error) {
    throw new Error(`TTS failed: ${error}`);
  }
}
