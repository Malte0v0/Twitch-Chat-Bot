export type CommandInput = {
  command: string;
  args: string;
  user: {
    id: number;
    login: string;
    name: string;
  };
  channel: {
    id: number;
    name: string;
  };
  receivedAt: Date;
};
