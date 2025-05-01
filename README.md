# Лабораторная работа 7
## Знакомство с объектными хранилищами
### Цель работы
Познакомиться с процессом сохранения файлов на примере S3 совместимого хранилища, познакомиться с передачей файлов посредством Stream'ов

### Технические требования:
- Наличие интернет-соединения
- Наличие [Postman](https://www.postman.com/downloads/) или [Insomnia](https://insomnia.rest/download)
- Наличие [Node](https://nodejs.org/en) [v22 и выше] или наличие [NVM](https://github.com/nvm-sh/nvm) для переключения между версиями Node
- Наличие [Docker](https://docs.docker.com/desktop/)

### Ход работы:

1. В директории с лабораторной работой выполните запуск контейнеров при помощи команды `docker-compose up -d` (`docker compose up -d`)

2. В директории с лабораторной работой выполните установку зависимостей при комощи команды `npm i`

3. Сконфигурируйте MinIO для дальнейшей работы

- При помощи веб-конфигуратора

  a. Перейдите в веб-конфигуратор из браузера [по следующему адресу](http://localhost:9001)
![](https://storage.yandexcloud.net/shesterikov/WP/WP_7_1.png)
Для входа используете данные из файла `docker-compose.yml`
По умолчанию
```
username: admin
password: 123123vv
```

  b. Создайте Bucket `storage` в разделе [Object Browser](http://localhost:9001/browser) с помощью кнопки `Create bucket`

![](https://storage.yandexcloud.net/shesterikov/WP/WP_7_2.png)
![](https://storage.yandexcloud.net/shesterikov/WP/WP_7_3.png)
![](https://storage.yandexcloud.net/shesterikov/WP/WP_7_4.png)

  c. В разделе [Access Keys](http://localhost:9001/access-keys) создайте новый ключ доступа
![](https://storage.yandexcloud.net/shesterikov/WP/WP_7_5.png)
![](https://storage.yandexcloud.net/shesterikov/WP/WP_7_6.png)
![](https://storage.yandexcloud.net/shesterikov/WP/WP_7_7.png)

  d. Модифицируйте файл `src/file/file.service.js` с учетом полученных `Access Key` и `Secret Key` 

  e. Добавьте новый регион `ru-rnd-1` в разделе [MinIO Configuration](http://localhost:9001/settings/configurations/region) и выполните перезапуск хранилища
![](https://storage.yandexcloud.net/shesterikov/WP/WP_7_7.png)

4. В директории с лабораторной работой выполните запуск проекта с помощью команды `npm run start:dev`

5. Выполните следующий запрос в Postman или Insomnia для подгрузки нового файла. Обратите внимание, путь к файлу может отличаться, равно как и его название

```
curl --location 'localhost:3000/files' \
--form 'file=@"/Users/dmitry/Downloads/openapi.yaml"'
```

![](https://storage.yandexcloud.net/shesterikov/WP/WP_7_9.png)

В результате запроса будет выведена метаинформация о файле, полученная из MinIO. В дальнейшем часть данной информации должна быть сохранена в соответствующей модели в СУБД PostgreSQL

Пример JSON с ответом сервера приведен ниже
```
{
    "data": {
        "$metadata": {
            "httpStatusCode": 200,
            "requestId": "183A3AB975630C71",
            "extendedRequestId": "dd9025bab4ad464b049177c95eb6ebf374d3b3fd1af9251148b658df7ac2e3e8",
            "attempts": 1,
            "totalRetryDelay": 0
        },
        "ETag": "\"d7d87805c2366c945f3b9a46ca85f30f\"",
        "ChecksumCRC32": "j1LeMw==",
        "Bucket": "storage",
        "Key": "imav9fzzj4a.yaml",
        "Location": "http://localhost:9000/storage/imav9fzzj4a.yaml"
    }
}
```

6. Убедитесь в существовании нового файла в MinIO, перейдя в соответствующий [бакет](http://localhost:9001/browser/storage)
![](https://storage.yandexcloud.net/shesterikov/WP/WP_7_10.png)

7. Модифицируйте исходный код приложения в соответствии со следующими требованиями:

- Требуется реализовать хранение следующей метаинформации о файле: 

  a. идентификатор файла в СУБД `id` (поле должно представлять собой случайно сгенерированную строку или UUID)

  b. идентификатор файла в MinIO `key`

  c. оригинальное название файла `original_name` 

  d. размер файла `size` [опционально], 

  e. наименование бакета, в котором располагается файл `bucket` 

  f. идентификатор пользователя, загрузившего файл `user_id` 

  g. идентификатор связанной сущности `entity_id`

  h. Mime type `mime_type`;

Для получения данной информации предполагается использование библиотеки [fastify-multipart](https://github.com/fastify/fastify-multipart) и данных, полученных из MinIO после завершения загрузки

- Требуется реализовать [связку модели](https://sequelize.org/docs/v6/core-concepts/assocs/) с мета информацией о файле с моделью вашей предметной области и моделью пользователя;

- Требуется изменить ендпоинт `POST /files`:

  a. при сохранении файла поместив метаинформацию о сохранненном файле в созданную модель файла

  b. модифицировав возвращаемые данные в соответствии с примером ниже
  ```
  {
    "id": "a8f6b440-1929-4953-9d16-2dda56ed0377",
    "key": "imav9fzzj4a.yaml",
    "mime_type": "text/yaml",
    "url": "http://localhost:3000/files/a8f6b440-1929-4953-9d16-2dda56ed0377",
  }
  ```

- Требуется реализовать ендпоинт `GET /files/:fileId`:

  a. Выполнив предварительную проверку наличия записи о файле в СУБД по `fileId` (id)

  b. Выполнив пересылку данных файла с помощью Stream клиенту

- Требуется модифицировать ендпоинты создания и обновления сущностей предметной области:

  a.добавив поддержку поля `fileId`

  Ниже представлен пример такого запроса
  ```
  curl --location 'localhost:3000/pokemons' \
  --header 'accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
      "name": "Snorlax",
      "fileId": "a8f6b440-1929-4953-9d16-2dda56ed0377"
  }'
  ```

  b. добавив возврат поля `fileUrl`, с которого можно произвести скачивание файла. Обратите внимание, MinIO адрес в данном случае не должен фигурировать как URL адрес. Запросы к MinIO должны проксироваться через API.


### Документация:

[MinIO](https://github.com/minio/minio)

[Node.js Streams для чайников или как работать с потоками](https://habr.com/ru/articles/479048/)

[@fastify/multipart](https://github.com/fastify/fastify-multipart)

[Defining the Sequelize associations](https://sequelize.org/docs/v6/core-concepts/assocs/)

### Контрольные вопросы:
1. Что такое MinIO? Какие преимущества MinIO по сравнению с хранением файлов в локальной файловой системе?

2. Что такое Stream? Какие виды Stream вы знаете? В чем преимущество использования Stream по сравнению с передачей файла через [Buffer](https://github.com/fastify/fastify-multipart?tab=readme-ov-file#usage)?

3. Что такое Mime тип?

4. Для чего нужны `Access key` и `Secret key`?