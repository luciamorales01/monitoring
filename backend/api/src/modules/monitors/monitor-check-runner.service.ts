import { Injectable, Logger } from '@nestjs/common';
import {
  buildHttpStatusErrorMessage,
  buildMonitorCheckErrorMessage,
  isMonitorCheckTimeoutError,
  isRedirectStatus,
} from './monitors.service.helpers';
import {
  MonitorStatus,
  type MonitorCheckOutcome,
  type MonitorEntity,
} from './monitors.service.types';
import { MonitorTargetValidatorService } from './monitor-target-validator.service';

@Injectable()
export class MonitorCheckRunnerService {
  private readonly logger = new Logger(MonitorCheckRunnerService.name);

  constructor(
    private readonly targetValidator: MonitorTargetValidatorService,
  ) {}

  async executeMonitorChecks(
    monitor: MonitorEntity,
  ): Promise<MonitorCheckOutcome[]> {
    return [await this.executeSingleCheck(monitor)];
  }

  private async executeSingleCheck(
    monitor: MonitorEntity,
  ): Promise<MonitorCheckOutcome> {
    return this.executeHttpCheck(monitor);
  }

  private async executeHttpCheck(
    monitor: MonitorEntity,
  ): Promise<MonitorCheckOutcome> {
    const checkedAt = new Date();
    const startTime = performance.now();

    try {
      const parsedUrl = await this.targetValidator.parsePublicHttpUrl(
        monitor.target,
      );

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        monitor.timeoutSeconds * 1000,
      );

      try {
        const { response, redirectChain } = await this.fetchHttpResponse(
          parsedUrl,
          controller.signal,
          monitor,
        );
        const statusCodeMatches = this.doesHttpStatusMatch(
          response.status,
          monitor.expectedStatusCode,
        );

        if (redirectChain.length > 0) {
          this.logger.log(
            `HTTP monitor ${monitor.id} redirect chain: ${redirectChain.join(' | ')}`,
          );
        }

        return {
          checkedAt,
          errorMessage: statusCodeMatches
            ? null
            : buildHttpStatusErrorMessage(
                response.status,
                monitor.expectedStatusCode,
              ),
          responseTimeMs: Math.round(performance.now() - startTime),
          status: statusCodeMatches ? MonitorStatus.UP : MonitorStatus.DOWN,
          statusCode: response.status,
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      const errorMessage = buildMonitorCheckErrorMessage(
        error,
        monitor.timeoutSeconds,
      );

      if (isMonitorCheckTimeoutError(error)) {
        this.logger.warn(`HTTP monitor ${monitor.id} timeout: ${errorMessage}`);
      }

      return {
        checkedAt,
        errorMessage,
        responseTimeMs: Math.round(performance.now() - startTime),
        status: MonitorStatus.DOWN,
        statusCode: null,
      };
    }
  }

  private async fetchHttpResponse(
    initialUrl: URL,
    signal: AbortSignal,
    monitor: Pick<MonitorEntity, 'id'>,
  ) {
    const redirectChain: string[] = [];
    const maxRedirects = 5;
    let currentUrl = initialUrl;

    for (let attempt = 0; attempt <= maxRedirects; attempt += 1) {
      const response = await fetch(currentUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal,
        headers: {
          'User-Agent': 'MonitoringTFG/1.0',
        },
      });

      this.logger.log(
        `HTTP monitor ${monitor.id} response: status=${response.status} url=${currentUrl.toString()}`,
      );

      if (!isRedirectStatus(response.status)) {
        return { response, redirectChain };
      }

      const redirectHeader = response.headers.get('Location');

      if (!redirectHeader) {
        return { response, redirectChain };
      }

      const nextUrl = await this.targetValidator.parsePublicHttpUrl(
        new URL(redirectHeader, currentUrl).toString(),
      );

      redirectChain.push(
        `${response.status} ${currentUrl.toString()} -> ${nextUrl.toString()}`,
      );

      if (attempt === maxRedirects) {
        this.logger.warn(
          `HTTP monitor ${monitor.id} redirect limit reached: ${redirectChain.join(' | ')}`,
        );
        return { response, redirectChain };
      }

      currentUrl = nextUrl;
    }

    throw new Error('Redirect no resuelto');
  }

  private doesHttpStatusMatch(statusCode: number, expectedStatusCode: number) {
    return statusCode === expectedStatusCode;
  }
}
