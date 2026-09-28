export interface ParamDefinition {
    value: number;
    min: number;
    max: number;
    step: number;
    label: string;
    unit: string;
    description?: string;
}

export interface SimBaseConfig {
    id: string;
    containerId?: string;
    controlsContainerId?: string;
    params?: Record<string, ParamDefinition>;
    setup?: (p: any, ctx: SimBase) => void;
    getReadouts?: (ctx: SimBase) => Record<string, string | number>;
    targetFps?: number;
}

export declare class SimBase {
    id: string;
    containerId: string;
    controlsContainerId: string;
    paramDefs: Record<string, ParamDefinition>;
    params: Record<string, number>;
    isPlaying: boolean;
    speed: number;
    simTime: number;
    p: any;
    p5Instance: any;

    constructor(config: SimBaseConfig);
    initParameters(): void;
    syncUrlParams(): void;
    mount(): any;
    updateTelemetry(): void;
    togglePlay(): void;
    reset(): void;
    setTimeout(fn: () => void, delay: number): any;
    setInterval(fn: () => void, delay: number): any;
    destroy(): void;
    onReset?: () => void;
    onResize?: (width: number, height: number) => void;
    onParamChange?: (key: string, value: number) => void;
}

declare global {
    interface Window {
        SimBase: typeof SimBase;
    }
}
