import path from 'node:path';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import File from '../models/file.model.js'; // Sequelize модель File
import { PassThrough } from 'stream';

dotenv.config();

export class FileSerive {
  static client = new S3Client({
    region: "ru-rnd-1",
    endpoint: "http://localhost:9000",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.SECRET_ACCESS_KEY
    },
  });

  static async saveFile(fileStream, fileName, mimetype, userId, entityId = null) {
    try {
      const fileKey = `${uuidv4()}${path.extname(fileName)}`;
      const bucket = process.env.MINIO_BUCKET_NAME;

      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const size = buffer.length;

      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: bucket,
          Key: fileKey,
          Body: buffer,
          ContentType: mimetype,
        },
        queueSize: 4,
        partSize: 1024 * 1024 * 5,
        leavePartsOnError: false,
      });

      await upload.done();

      const fileRecord = await File.create({
        id: uuidv4(),
        key: fileKey,
        original_name: fileName,
        size,
        bucket,
        user_id: userId,
        entity_id: entityId,
        mime_type: mimetype,
      });

      return {
        error: null,
        data: {
          id: fileRecord.id,
          key: fileRecord.key,
          mime_type: fileRecord.mime_type,
          url: `http://localhost:${process.env.PORT}/files/${fileRecord.id}`
        }
      };
    } catch (error) {
      console.error('SaveFile error:', error);
      return { error, data: null };
    }
  }

  static async getFileStreamById(fileId) {
    try {
      const file = await File.findByPk(fileId);

      if (!file) {
        return { error: 'File not found', stream: null, meta: null };
      }

      const command = new GetObjectCommand({
        Bucket: file.bucket,
        Key: file.key,
      });

      const response = await this.client.send(command);
      const stream = response.Body;

      return { error: null, stream, meta: file };
    } catch (error) {
      console.error('GetFileStream error:', error);
      return { error: error.message, stream: null, meta: null };
    }
  }
}
