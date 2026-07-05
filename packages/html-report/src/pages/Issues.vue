<template>
	<div class="flex max-w-7xl flex-col">
		<h2 class="text-2xl font-bold">Issues</h2>

		<p class="mt-4 text-gray-500">
			Warnings and recommendations detected in the report. This page will include different issue types as Sonda gains
			more bundle checks.
		</p>

		<hr class="mt-4 mb-6 border-gray-100" />

		<div
			v-if="!issues.length"
			class="rounded-lg border border-gray-200 bg-white p-6 text-gray-500 shadow-xs"
		>
			No issues detected.
		</div>

		<div
			v-else
			class="mb-4 flex gap-2"
		>
			<Dropdown
				v-model="types"
				:options="availableTypeOptions"
				title="Type"
			>
				<template #icon>
					<IconFunnel :size="16" />
				</template>
			</Dropdown>
		</div>

		<DataTable
			v-if="issues.length"
			v-model="active"
			:columns="COLUMNS"
			:data="filteredIssues"
			id="id"
		>
			<template #row="{ item }">
				<td class="p-3 font-normal text-gray-900">
					<div class="flex items-center gap-2 capitalize">
						<IconCircleAlert
							:size="16"
							:class="getSeverityClass(item.severity)"
							class="shrink-0"
						/>
						<span>{{ item.severity }}</span>
					</div>
				</td>
				<td class="p-3 font-normal text-gray-900">{{ item.message }}</td>
			</template>

			<template #collapsible="{ item }">
				<p class="font-bold">Type</p>
				<p class="mt-2 text-gray-700">{{ item.type }}</p>

				<template v-if="item.data !== undefined">
					<p class="mt-8 font-bold">Issue data</p>

					<pre class="mt-2 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">{{
						formatIssueData(item.data)
					}}</pre>
				</template>
			</template>
		</DataTable>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { router } from '@/router.js';
import { report } from '@/report.js';
import DataTable, { type Column } from '@components/common/DataTable.vue';
import Dropdown, { type DropdownOption } from '@components/common/Dropdown.vue';
import IconCircleAlert from '@icon/CircleAlert.vue';
import IconFunnel from '@components/icon/Funnel.vue';
import type { Issue, IssueSeverity } from 'sonda';

interface Item extends Issue {
	id: string;
}

const COLUMNS: Array<Column<Item>> = [
	{ name: 'Severity', key: 'severity', align: 'left', width: '140px' },
	{ name: 'Issue', key: 'message', align: 'left' }
];

const active = ref('');
const types = computed(router.computedQuery('types', [] as Array<string>));
const issues = computed<Array<Item>>(() =>
	report.value!.issues.map((issue, index) => ({ ...issue, id: String(index) }))
);
const availableTypeOptions = computed<Array<DropdownOption>>(() => {
	const issueTypes = issues.value.map(issue => issue.type).toSorted();
	const uniqueTypes = issueTypes.filter((type, index) => type !== issueTypes[index - 1]);

	return uniqueTypes.map(type => ({ label: formatIssueType(type), value: type }));
});
const filteredIssues = computed(() => {
	return issues.value.filter(issue => !types.value.length || types.value.includes(issue.type));
});

watch(types, () => {
	active.value = '';
});

function getSeverityClass(severity: IssueSeverity): string {
	return {
		info: 'text-blue-500',
		warning: 'text-amber-500',
		error: 'text-red-500'
	}[severity];
}

function formatIssueType(type: string): string {
	return type
		.split('-')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function formatIssueData(data: unknown): string {
	return JSON.stringify(data, null, '\t');
}
</script>
