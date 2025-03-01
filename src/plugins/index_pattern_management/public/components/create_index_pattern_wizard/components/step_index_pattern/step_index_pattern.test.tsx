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

import React from 'react';
import { SavedObjectsFindResponsePublic } from 'opensearch-dashboards/public';
import { StepIndexPattern, canPreselectTimeField } from './step_index_pattern';
import { Header } from './components/header';
import { IndexPatternCreationConfig } from '../../../../../../../plugins/index_pattern_management/public';
import { mockManagementPlugin } from '../../../../mocks';
import { createComponentWithContext } from '../../../test_utils';

jest.mock('../../lib/ensure_minimum_time', () => ({
  ensureMinimumTime: async (promises: Array<Promise<any>>) =>
    Array.isArray(promises) ? await Promise.all(promises) : await promises,
}));

const mockIndexPatternCreationType = new IndexPatternCreationConfig({
  type: 'default',
  name: 'name',
});

jest.mock('../../lib/get_indices', () => ({
  getIndices: ({ pattern }: { pattern: string }) => {
    if (pattern.startsWith('o')) {
      return [{ name: 'opensearch', item: {} }];
    }

    return [{ name: 'opensearch-dashboards', item: {} }];
  },
}));

const allIndices = [
  { name: 'opensearch-dashboards', tags: [], item: {} },
  { name: 'opensearch', tags: [], item: {} },
];

const goToNextStep = () => {};

const mockContext = mockManagementPlugin.createIndexPatternManagmentContext();

mockContext.savedObjects.client.find = async () =>
  Promise.resolve(({ savedObjects: [] } as unknown) as SavedObjectsFindResponsePublic<any>);
mockContext.uiSettings.get.mockReturnValue('');

describe('StepIndexPattern', () => {
  it('renders the loading state', () => {
    const component = createComponentWithContext(
      StepIndexPattern,
      {
        allIndices,
        isIncludingSystemIndices: false,
        goToNextStep,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );
    component.setState({ isLoadingIndices: true });
    expect(component.find('[data-test-subj="createIndexPatternStep1Loading"]')).toMatchSnapshot();
  });

  it('renders indices which match the initial query', async () => {
    const component = createComponentWithContext(
      StepIndexPattern,
      {
        allIndices,
        isIncludingSystemIndices: false,
        goToNextStep,
        indexPatternCreationType: mockIndexPatternCreationType,
        initialQuery: 'opensearch-dashboards',
      },
      mockContext
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    await component.update();

    expect(
      component.find('[data-test-subj="createIndexPatternStep1IndicesList"]')
    ).toMatchSnapshot();
  });

  it('renders errors when input is invalid', async () => {
    const component = createComponentWithContext(
      StepIndexPattern,
      {
        allIndices,
        isIncludingSystemIndices: false,
        goToNextStep,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );
    const instance = component.instance() as StepIndexPattern;
    instance.onQueryChanged({ target: { value: '?' } } as React.ChangeEvent<HTMLInputElement>);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect({
      component: component.find('[data-test-subj="createIndexPatternStep1Header"]'),
    }).toMatchSnapshot();
  });

  it('renders matching indices when input is valid', async () => {
    const component = createComponentWithContext(
      StepIndexPattern,
      {
        allIndices,
        isIncludingSystemIndices: false,
        goToNextStep,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );
    const instance = component.instance() as StepIndexPattern;
    instance.onQueryChanged({ target: { value: 'o' } } as React.ChangeEvent<HTMLInputElement>);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(
      component.find('[data-test-subj="createIndexPatternStep1IndicesList"]')
    ).toMatchSnapshot();
  });

  it('appends a wildcard automatically to queries', async () => {
    const component = createComponentWithContext(
      StepIndexPattern,
      {
        allIndices,
        isIncludingSystemIndices: false,
        goToNextStep,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );
    const instance = component.instance() as StepIndexPattern;
    instance.onQueryChanged({ target: { value: 'o' } } as React.ChangeEvent<HTMLInputElement>);
    expect(component.state('query')).toBe('o*');
  });

  it('disables the next step if the index pattern exists', async () => {
    const component = createComponentWithContext(
      StepIndexPattern,
      {
        allIndices,
        isIncludingSystemIndices: false,
        goToNextStep,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );
    component.setState({ indexPatternExists: true });
    expect(component.find(Header).prop('isNextStepDisabled')).toBe(true);
  });

  it('ensures the response of the latest request is persisted', async () => {
    const component = createComponentWithContext(
      StepIndexPattern,
      {
        allIndices,
        isIncludingSystemIndices: false,
        goToNextStep,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );
    const instance = component.instance() as StepIndexPattern;
    instance.onQueryChanged({ target: { value: 'o' } } as React.ChangeEvent<HTMLInputElement>);
    instance.lastQuery = 'o';
    await new Promise((resolve) => process.nextTick(resolve));

    // Honesty, the state would match the result of the `k` query but
    // it's hard to mock this in tests but if remove our fix
    // (the early return if the queries do not match) then this
    // equals [{name: 'opensearch'}]
    expect(component.state('exactMatchedIndices')).toEqual([]);

    // Ensure it works in the other code flow too (the other early return)

    // Provide `opensearch` so we do not auto append * and enter our other code flow
    instance.onQueryChanged({
      target: { value: 'opensearch' },
    } as React.ChangeEvent<HTMLInputElement>);
    instance.lastQuery = 'o';
    await new Promise((resolve) => process.nextTick(resolve));
    expect(component.state('exactMatchedIndices')).toEqual([]);
  });

  it('it can preselect time field', async () => {
    const dataStream1 = {
      name: 'data stream 1',
      tags: [],
      item: { name: 'data stream 1', backing_indices: [], timestamp_field: 'timestamp_field' },
    };

    const dataStream2 = {
      name: 'data stream 2',
      tags: [],
      item: { name: 'data stream 2', backing_indices: [], timestamp_field: 'timestamp_field' },
    };

    const differentDataStream = {
      name: 'different data stream',
      tags: [],
      item: { name: 'different data stream 2', backing_indices: [], timestamp_field: 'x' },
    };

    const index = {
      name: 'index',
      tags: [],
      item: {
        name: 'index',
      },
    };

    const alias = {
      name: 'alias',
      tags: [],
      item: {
        name: 'alias',
        indices: [],
      },
    };

    expect(canPreselectTimeField([index])).toEqual(undefined);
    expect(canPreselectTimeField([alias])).toEqual(undefined);
    expect(canPreselectTimeField([index, alias, dataStream1])).toEqual(undefined);

    expect(canPreselectTimeField([dataStream1])).toEqual('timestamp_field');

    expect(canPreselectTimeField([dataStream1, dataStream2])).toEqual('timestamp_field');

    expect(canPreselectTimeField([dataStream1, dataStream2, differentDataStream])).toEqual(
      undefined
    );
  });
});
