import { MergeRequest, MergeRequestWithProject, User } from './types'
import { Data } from './loadData'
import moment from 'moment'

let count = 0

const users: User[] = [
    {
        id: 1,
        name: 'Matthias',
        username: 'ruettenm',
        avatar_url: `/${require('../../images/matthias.jpg').default}`,
    },
    {
        id: 2,
        name: 'Julian',
        username: 'jukempff',
        avatar_url: `/${require('../../images/julian.jpg').default}`,
    },
    {
        id: 3,
        name: 'Polina',
        username: 'polina.tagirova',
        avatar_url: `/${require('../../images/polina.jpg').default}`,
    },
]

let mrId = 0

const createMr = (title: string, projectId: number, wip = false): MergeRequest => {
    mrId++
    const timestamp = moment()
        .subtract(1, 'hours')
        .add(mrId * 4 + 10, 'minutes')
        .format('YYYY-MM-DD HH:mm:ss')

    return {
        id: wip ? mrId * -1 : mrId,
        iid: mrId,
        created_at: timestamp,
        updated_at: timestamp,
        project_id: wip ? projectId * -1 : projectId,
        title,
        state: 'opened',
        target_branch: 'something',
        source_branch: 'something',
        upvotes: randomArrayEntry([0, 0, 0, 0, 0, 1, 3, 5]),
        downvotes: randomArrayEntry([0, 0, 0, 0, 0, 1, 3, 5]),
        author: randomArrayEntry(users),
        assignee: randomArrayEntry(users),
        source_project_id: projectId,
        work_in_progress: wip,
        user_notes: {
            all: randomArrayEntry([3, 5]),
            resolved: randomArrayEntry([1, 2, 3]),
        },
        web_url: `https://www.google.de?q=mr-${mrId}`,
        pipeline_status: randomArrayEntry([undefined, 'running', 'pending', 'success', 'failed']),
    }
}

function randomArrayEntry<T>(array: T[]): T {
    const max = array.length - 1
    const index = Math.round(Math.random() * max)

    return array[index]
}

const testData = (): Data => {
    count++
    mrId = 0

    const groupedMergeRequests = [
        {
            project: {
                id: 1,
                name: 'Merge Request Notifier',
                name_with_namespace: 'codecentric / Merge Request Notifier',
            },
            mergeRequests: [
                createMr('My amazing Merge Request', 1),
                createMr('An other fancy new feature', 1),
                createMr('Refactor ui components', 1),
                createMr('MergeRequestWithAVeryVeryVeryVeryLongTitleWithoutSpaces', 1),
                createMr('Fix Bug: The app is crashing after login', 1),
            ],
        },
        // {
        //     project: {
        //         id: 2,
        //         name: 'Component Library',
        //         name_with_namespace: 'UX & I / Component Library',
        //     },
        //     mergeRequests: [
        //         createMr('New Button styles', 2),
        //         createMr('Implement Date Picker', 2),
        //         createMr('Fix Bug: Internet Explorer is not showning the SVGs icons properly', 2),
        //     ],
        // },
        // {
        //     project: {
        //         id: 3,
        //         name: 'Another Project',
        //         name_with_namespace: 'codecentric / Another Project',
        //     },
        //     mergeRequests: [
        //         createMr('1. Merge Request', 3),
        //         createMr('2. Merge Request', 3),
        //         createMr('3. Merge Request', 3),
        //         createMr('4. Merge Request', 3),
        //         createMr('5. Merge Request', 3),
        //         createMr('6. Merge Request', 3),
        //         createMr('7. Merge Request', 3),
        //         createMr('8. Merge Request', 3),
        //         createMr('9. Merge Request', 3),
        //     ],
        // },
    ]

    const wip = count % 2 === 1
    groupedMergeRequests.push({
        project: {
            id: wip ? -4 : 4,
            name: wip ? 'WIP / Some other cool project' : 'Some other cool project',
            name_with_namespace: wip ? 'WIP / codecentric / Some other cool project' : 'codecentric / Some other cool project',
        },
        mergeRequests: [createMr('Rotating WIP Merge Request 🙏', 4, wip)],
    })

    const mergeRequestWithProjects: MergeRequestWithProject[] = []
    groupedMergeRequests.forEach((groupedMergeRequest) => {
        groupedMergeRequest.mergeRequests.forEach((mergeRequest) => {
            mergeRequestWithProjects.push({
                ...mergeRequest,
                project: groupedMergeRequest.project,
            })
        })
    })

    return {
        groupedMergeRequests,
        mergeRequestWithProjects,
    }
}

export default testData
