/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import { i18n, i18nLoader } from '@osd/i18n';
import { basename } from 'path';
import { Server } from '@hapi/hapi';
import { fromRoot } from '../../../core/server/utils';
import type { UsageCollectionSetup } from '../../../plugins/usage_collection/server';
import { getTranslationPaths } from './get_translations_path';
import { I18N_RC } from './constants';
import OsdServer, { OpenSearchDashboardsConfig } from '../osd_server';
import { registerLocalizationUsageCollector } from './localization';

export async function i18nMixin(
  osdServer: OsdServer,
  server: Server,
  config: OpenSearchDashboardsConfig
) {
  const locale = config.get('i18n.locale') as string;

  const translationPaths = await Promise.all([
    getTranslationPaths({
      cwd: fromRoot('.'),
      glob: `**/${I18N_RC}`,
    }),
    ...(config.get('plugins.paths') as string[]).map((cwd) =>
      getTranslationPaths({ cwd, glob: I18N_RC })
    ),
    ...(config.get('plugins.scanDirs') as string[]).map((cwd) =>
      getTranslationPaths({ cwd, glob: `**/${I18N_RC}` })
    ),
    getTranslationPaths({
      cwd: fromRoot('../opensearch-dashboards-extra'),
      glob: `**/${I18N_RC}`,
    }),
  ]);

  const currentTranslationPaths = ([] as string[])
    .concat(...translationPaths)
    .filter((translationPath) => basename(translationPath, '.json') === locale);
  i18nLoader.registerTranslationFiles(currentTranslationPaths);

  const translations = await i18nLoader.getTranslationsByLocale(locale);
  i18n.init(
    Object.freeze({
      locale,
      ...translations,
    })
  );

  const getTranslationsFilePaths = () => currentTranslationPaths;

  server.decorate('server', 'getTranslationsFilePaths', getTranslationsFilePaths);

  if (osdServer.newPlatform.setup.plugins.usageCollection) {
    const { usageCollection } = osdServer.newPlatform.setup.plugins as {
      usageCollection: UsageCollectionSetup;
    };
    registerLocalizationUsageCollector(usageCollection, {
      getLocale: () => config.get('i18n.locale') as string,
      getTranslationsFilePaths,
    });
  }
}
