import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import {
  extractHostnameFromTarget,
  isBlockedHostname,
  isPrivateAddress,
  parseMonitorHttpUrl,
} from './monitors.service.helpers';

@Injectable()
export class MonitorTargetValidatorService {
  async assertAllowedTarget(target: string) {
    await this.parsePublicHttpUrl(target);
  }

  async parsePublicHttpUrl(target: string) {
    const parsedUrl = parseMonitorHttpUrl(target);

    await this.assertPublicHostTarget(parsedUrl.hostname);

    return parsedUrl;
  }

  private async assertPublicHostTarget(target: string) {
    const hostname = extractHostnameFromTarget(target);

    if (!hostname || isBlockedHostname(hostname)) {
      throw new BadRequestException(
        'El destino del monitor no estÃ¡ permitido',
      );
    }

    const addresses = isIP(hostname)
      ? [{ address: hostname }]
      : await lookup(hostname, { all: true, verbatim: true });

    if (addresses.length === 0) {
      throw new BadRequestException(
        'No se pudo resolver el destino del monitor',
      );
    }

    if (addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new BadRequestException(
        'El destino del monitor no estÃ¡ permitido',
      );
    }

    return hostname;
  }
}
