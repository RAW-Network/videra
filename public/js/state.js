export const state = {
    selectedFile: null,
    eventSource: null,
    maxUploadSizeBytes: 0,
    maxUploadSizeString: '',
    currentXHR: null,
    currentJobId: null,
};

export function resetState() {
    state.selectedFile = null;
    state.currentJobId = null;
    if (state.eventSource) {
        state.eventSource.close();
        state.eventSource = null;
    }
    if (state.currentXHR) {
        state.currentXHR.abort();
        state.currentXHR = null;
    }
}
