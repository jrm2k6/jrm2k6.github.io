---
layout: post
title: Sequelize Cheatsheet / Gotchas 
---

## Postgres

### UUIDs columns

- Tested with postgres 13.1 and sequelize-cli 6.2.0.

If you want to use uuids with a default value you cannot rely on using Sequelize.UUIDV4 or an equivalent.

As a workaround you can:
1.  make sure the `uuid-ossp` is installed and enabled on your postgres server:  
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

2. in your schema definition (in this case, a migration file):
```
await queryInterface.createTable('your-table', {
    uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.fn('uuid_generate_v4'),
        allowNull: false,
        primaryKey: true,
    }
});
```

### Default timestamp for column
- Tested with postgres 13.1 and sequelize-cli 6.2.0.

As part of your migration:

```
createdAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.fn('now'),
}
```
