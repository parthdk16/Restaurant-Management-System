import AWS from 'aws-sdk';

AWS.config.update({
  accessKeyId: 'AKIAXZ5NGL33FNF5YITQ',
  secretAccessKey: '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',
  region: 'us-east-1',
});

export const s3 = new AWS.S3();