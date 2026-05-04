declare module 'expo-location' {
  export const Accuracy: {
    High: number;
  };

  export function getCurrentPositionAsync(options?: Record<string, unknown>): Promise<{
    coords: {
      latitude: number;
      longitude: number;
    };
  }>;
}

declare module 'expo-background-fetch' {
  export enum BackgroundFetchResult {
    NewData = 'NewData',
    NoData = 'NoData',
    Failed = 'Failed',
  }

  export function registerTaskAsync(
    taskName: string,
    options?: Record<string, unknown>
  ): Promise<void>;
  export function unregisterTaskAsync(taskName: string): Promise<void>;
}

declare module 'expo-task-manager' {
  export function defineTask(
    taskName: string,
    taskExecutor: () => Promise<unknown>
  ): void;
}
