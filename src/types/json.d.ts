declare module "*.json" {
  const value: {
    title: string;
    sections: Array<{
      id: string;
      prompt: string;
    }>;
    type: 'interview';
  };
  export default value;
}


