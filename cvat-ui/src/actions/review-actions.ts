// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import getCore from 'cvat-core-wrapper';

const cvat = getCore();

export enum ReviewActionTypes {
    INITIALIZE_REVIEW_SUCCESS = 'INITIALIZE_REVIEW_SUCCESS',
    INITIALIZE_REVIEW_FAILED = 'INITIALIZE_REVIEW_FAILED',
    CREATE_ISSUE = 'CREATE_ISSUE',
    START_ISSUE = 'START_ISSUE',
    FINISH_ISSUE_SUCCESS = 'FINISH_ISSUE_SUCCESS',
    FINISH_ISSUE_FAILED = 'FINISH_ISSUE_FAILED',
    CANCEL_ISSUE = 'CANCEL_ISSUE',
    RESOLVE_ISSUE_SUCCESS = 'RESOLVE_ISSUE_SUCCESS',
    RESOLVE_ISSUE_FAILED = 'RESOLVE_ISSUE_FAILED',
    REOPEN_ISSUE_SUCCESS = 'REOPEN_ISSUE_SUCCESS',
    REOPEN_ISSUE_FAILED = 'REOPEN_ISSUE_FAILED',
    COMMENT_ISSUE_SUCCESS = 'COMMENT_ISSUE_SUCCESS',
    COMMENT_ISSUE_FAILED = 'COMMENT_ISSUE_FAILED',
    SUBMIT_REVIEW_SUCCESS = 'SUBMIT_REVIEW_SUCCESS',
    SUBMIT_REVIEW_FAILED = 'SUBMIT_REVIEW_FAILED',
}

export const reviewActions = {
    initializeReviewSuccess: (reviewInstance: any, frame: number) =>
        createAction(ReviewActionTypes.INITIALIZE_REVIEW_SUCCESS, { reviewInstance, frame }),
    initializeReviewFailed: (error: any) => createAction(ReviewActionTypes.INITIALIZE_REVIEW_FAILED, { error }),
    createIssue: () => createAction(ReviewActionTypes.CREATE_ISSUE, {}),
    startIssue: (position: number[]) => createAction(ReviewActionTypes.START_ISSUE, { position }),
    finishIssueSuccess: (frame: number) => createAction(ReviewActionTypes.FINISH_ISSUE_SUCCESS, { frame }),
    finishIssueFailed: (error: any) => createAction(ReviewActionTypes.FINISH_ISSUE_FAILED, { error }),
    cancelIssue: () => createAction(ReviewActionTypes.CANCEL_ISSUE),
    commentIssueSuccess: () => createAction(ReviewActionTypes.COMMENT_ISSUE_SUCCESS),
    commentIssueFailed: (error: any) => createAction(ReviewActionTypes.COMMENT_ISSUE_FAILED, { error }),
    resolveIssueSuccess: () => createAction(ReviewActionTypes.RESOLVE_ISSUE_SUCCESS),
    resolveIssueFailed: (error: any) => createAction(ReviewActionTypes.RESOLVE_ISSUE_FAILED, { error }),
    reopenIssueSuccess: () => createAction(ReviewActionTypes.REOPEN_ISSUE_SUCCESS),
    reopenIssueFailed: (error: any) => createAction(ReviewActionTypes.REOPEN_ISSUE_FAILED, { error }),
    submitReviewSuccess: (activeReview: any, reviews: any[], issues: any[], frame: number) =>
        createAction(ReviewActionTypes.SUBMIT_REVIEW_SUCCESS, {
            activeReview,
            reviews,
            issues,
            frame,
        }),
    submitReviewFailed: (error: any) => createAction(ReviewActionTypes.SUBMIT_REVIEW_FAILED, { error }),
};

export type ReviewActions = ActionUnion<typeof reviewActions>;

export const initializeReviewAsync = (): ThunkAction => async (dispatch, getState) => {
    try {
        const state = getState();
        const {
            annotation: {
                job: { instance: jobInstance },
                player: {
                    frame: { number: frame },
                },
            },
        } = state;

        const reviews = await jobInstance.reviews();
        const count = reviews.length;
        let reviewInstance = null;
        if (count && reviews[count - 1].id < 0) {
            reviewInstance = reviews[count - 1];
        } else {
            reviewInstance = new cvat.classes.Review({ job: jobInstance.id });
        }

        dispatch(reviewActions.initializeReviewSuccess(reviewInstance, frame));
    } catch (error) {
        dispatch(reviewActions.initializeReviewFailed(error));
    }
};

export const finishIssueAsync = (message: string): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        annotation: {
            player: {
                frame: { number: frameNumber },
            },
        },
        review: { activeReview, newIssuePosition },
    } = state;

    try {
        await activeReview.openIssue({
            frame: frameNumber,
            position: newIssuePosition,
            owner: user,
            comment_set: [
                {
                    message,
                    author: user,
                },
            ],
        });
        await activeReview.toLocalStorage();
        dispatch(reviewActions.finishIssueSuccess(frameNumber));
    } catch (error) {
        dispatch(reviewActions.finishIssueFailed(error));
    }
};

export const commentIssueAsync = (id: number, message: string): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        review: { frameIssues, activeReview },
    } = state;

    try {
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.comment({
            message,
            author: user,
        });
        if (activeReview && activeReview.issues.includes(issue)) {
            await activeReview.toLocalStorage();
        }
        dispatch(reviewActions.commentIssueSuccess());
    } catch (error) {
        dispatch(reviewActions.commentIssueFailed(error));
    }
};

export const resolveIssueAsync = (id: number): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        review: { frameIssues, activeReview },
    } = state;

    try {
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.resolve(user);
        if (activeReview && activeReview.issues.includes(issue)) {
            await activeReview.toLocalStorage();
        }

        dispatch(reviewActions.resolveIssueSuccess());
    } catch (error) {
        dispatch(reviewActions.resolveIssueFailed(error));
    }
};

export const reopenIssueAsync = (id: number): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        auth: { user },
        review: { frameIssues, activeReview },
    } = state;

    try {
        const [issue] = frameIssues.filter((_issue: any): boolean => _issue.id === id);
        await issue.reopen(user);
        if (activeReview && activeReview.issues.includes(issue)) {
            await activeReview.toLocalStorage();
        }

        dispatch(reviewActions.reopenIssueSuccess());
    } catch (error) {
        dispatch(reviewActions.reopenIssueFailed(error));
    }
};

export const submitReviewAsync = (review: any): ThunkAction => async (dispatch, getState) => {
    const state = getState();
    const {
        annotation: {
            job: { instance: jobInstance },
            player: {
                frame: { number: frame },
            },
        },
    } = state;

    try {
        await review.submit(jobInstance.id);
        const reviews = await jobInstance.reviews();
        const issues = await jobInstance.issues();
        const reviewInstance = new cvat.classes.Review({ job: jobInstance.id });

        dispatch(reviewActions.submitReviewSuccess(reviewInstance, reviews, issues, frame));
    } catch (error) {
        dispatch(reviewActions.submitReviewFailed(error));
    }
};
