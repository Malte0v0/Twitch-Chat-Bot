export interface LocationRepositoryPort {
  getLocation(userId: string): string;
  saveLocation(userId: string, location: string): void;
}
