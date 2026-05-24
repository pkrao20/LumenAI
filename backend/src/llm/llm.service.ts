import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  async sendPrompt(prompt: string): Promise<string> {
    this.logger.log(`Sending prompt (${prompt.length} chars)`);
    return `Response to: ${prompt}`;
  }
}
