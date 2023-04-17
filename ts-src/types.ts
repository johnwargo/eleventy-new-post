export type ConfigObject = {
  categoryFolder: string;
  dataFileName: string;
  dataFolder: string;
  postsFolder: string;  
  templateFileName: string;
}

export type CategoryRecord = {
  category: string;
  count: number;
  description: string;
}

export type ConfigValidation = {
  filePath: string;
  isFolder: boolean;
}

export type ProcessResult = {
  result: boolean;
  message: string;
}