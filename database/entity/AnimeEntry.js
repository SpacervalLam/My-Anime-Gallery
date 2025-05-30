const { EntitySchema } = require('typeorm');

// 定义AnimeEntry实体的模式
module.exports = new EntitySchema({
  // 实体的名称
  name: 'AnimeEntry',
  // 对应的数据库表名
  tableName: 'anime_entries',
  // 定义实体的列信息
  columns: {
    // 主键列，自动递增
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    // 动画标题，不能为空
    title: {
      type: 'text',
      nullable: false
    },
    // 其他标题，可以为空
    altTitles: {
      type: 'text',
      nullable: true
    },
    // 封面图片路径，不能为空
    coverPath: {
      type: 'text',
      nullable: false
    },
    // 动画标签，可以为空
    tags: {
      type: 'text',
      nullable: true
    },
    // 相关链接，可以为空
    links: {
      type: 'text',
      nullable: true
    },
    // 背景音乐路径，可以为空
    music: {
      type: 'text',
      nullable: true
    },
    // 动画简介，可以为空
    description: {
      type: 'text',
      nullable: true
    }
  }
});