import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { DataSourceConfig } from './data-source';
import { UserRole, AssetStatus } from './common/enums';
import { Department } from './entities/department.entity';
import { User } from './entities/user.entity';
import { AssetCategory } from './entities/asset-category.entity';
import { Location } from './entities/location.entity';
import { Asset } from './entities/asset.entity';

const dataSource = new DataSource(DataSourceConfig);

async function seed() {
  console.log('🌱 开始初始化种子数据...');

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    const departmentRepo = dataSource.getRepository(Department);
    const userRepo = dataSource.getRepository(User);
    const categoryRepo = dataSource.getRepository(AssetCategory);
    const locationRepo = dataSource.getRepository(Location);
    const assetRepo = dataSource.getRepository(Asset);

    console.log('📋 清空现有数据...');
    await assetRepo.query('SET FOREIGN_KEY_CHECKS = 0');
    await assetRepo.clear();
    await locationRepo.clear();
    await categoryRepo.clear();
    await userRepo.clear();
    await departmentRepo.clear();
    await assetRepo.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('🏢 创建部门数据...');
    const departments = [
      { name: '总裁办', code: 'ZCB', description: '公司管理层', sort: 1 },
      { name: '技术部', code: 'JSB', description: '技术研发部门', sort: 2 },
      { name: '产品部', code: 'CPB', description: '产品设计部门', sort: 3 },
      { name: '市场部', code: 'SCB', description: '市场营销部门', sort: 4 },
      { name: '行政部', code: 'XZB', description: '行政后勤部门', sort: 5 },
      { name: '财务部', code: 'CWB', description: '财务部门', sort: 6 },
      { name: '人力资源部', code: 'RLB', description: '人力资源部门', sort: 7 },
    ];

    const savedDepartments = await departmentRepo.save(
      departments.map((d) => departmentRepo.create(d)),
    );
    console.log(`✅ 已创建 ${savedDepartments.length} 个部门`);

    console.log('👥 创建用户数据...');
    const users = [
      {
        employeeId: 'EMP000',
        username: 'admin',
        password: 'admin123',
        name: '超级管理员',
        phone: '13800000000',
        email: 'admin@company.com',
        role: UserRole.SUPER_ADMIN,
        departmentId: savedDepartments[0].id,
      },
      {
        employeeId: 'EMP001',
        username: 'manager',
        password: '123456',
        name: '资产管理员',
        phone: '13800000001',
        email: 'manager@company.com',
        role: UserRole.ADMIN,
        departmentId: savedDepartments[4].id,
      },
      {
        employeeId: 'EMP002',
        username: 'zhangsan',
        password: '123456',
        name: '张三',
        phone: '13800000002',
        email: 'zhangsan@company.com',
        role: UserRole.USER,
        departmentId: savedDepartments[1].id,
      },
      {
        employeeId: 'EMP003',
        username: 'lisi',
        password: '123456',
        name: '李四',
        phone: '13800000003',
        email: 'lisi@company.com',
        role: UserRole.USER,
        departmentId: savedDepartments[1].id,
      },
      {
        employeeId: 'EMP004',
        username: 'wangwu',
        password: '123456',
        name: '王五',
        phone: '13800000004',
        email: 'wangwu@company.com',
        role: UserRole.USER,
        departmentId: savedDepartments[2].id,
      },
      {
        employeeId: 'EMP005',
        username: 'zhaoliu',
        password: '123456',
        name: '赵六',
        phone: '13800000005',
        email: 'zhaoliu@company.com',
        role: UserRole.USER,
        departmentId: savedDepartments[3].id,
      },
    ];

    for (const userData of users) {
      const user = userRepo.create(userData);
      user.password = await bcrypt.hash(userData.password, 10);
      await userRepo.save(user);
    }
    console.log(`✅ 已创建 ${users.length} 个用户`);

    console.log('📂 创建资产类别数据...');
    const categories = [
      { name: '电子设备', code: 'DZSB', description: '电脑、手机等电子设备', sort: 1 },
      { name: '办公家具', code: 'BGJJ', description: '办公桌、椅子等', sort: 2 },
      { name: '办公用品', code: 'BGYP', description: '文具、耗材等', sort: 3 },
      { name: '机械设备', code: 'JXSB', description: '工具、设备等', sort: 4 },
      { name: '车辆', code: 'CL', description: '公司车辆', sort: 5 },
      { name: '房产', code: 'FC', description: '办公室、仓库等', sort: 6 },
    ];

    const savedCategories = await categoryRepo.save(
      categories.map((c) => categoryRepo.create(c)),
    );
    console.log(`✅ 已创建 ${savedCategories.length} 个资产类别`);

    console.log('📍 创建位置数据...');
    const locations = [
      { name: '总部大楼', code: 'ZBDL', description: '公司总部所在地', sort: 1 },
      { name: '研发中心', code: 'YFZX', description: '技术研发中心', sort: 2, parentId: 1 },
      { name: '行政中心', code: 'XZZX', description: '行政办公区域', sort: 3, parentId: 1 },
      { name: 'A座仓库', code: 'ACK', description: 'A座仓储区', sort: 4 },
      { name: 'B座仓库', code: 'BCK', description: 'B座仓储区', sort: 5 },
      { name: '研发部库房', code: 'YBK', description: '研发部资产库房', sort: 6, parentId: 2 },
    ];

    const savedLocations = await locationRepo.save(
      locations.map((l) => locationRepo.create(l)),
    );
    console.log(`✅ 已创建 ${savedLocations.length} 个位置`);

    console.log('💻 创建资产数据...');
    const assets = [
      {
        assetCode: 'AST001',
        name: 'MacBook Pro 14寸',
        brand: 'Apple',
        model: 'MacBook Pro M3',
        serialNumber: 'SN20240001',
        purchasePrice: 14999,
        purchaseDate: '2024-01-15',
        categoryId: savedCategories[0].id,
        locationId: savedLocations[5].id,
        status: AssetStatus.AVAILABLE,
        description: '研发用笔记本电脑',
        specifications: 'M3芯片, 16GB内存, 512GB存储',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=MacBook%20Pro%20laptop%20silver&image_size=square',
      },
      {
        assetCode: 'AST002',
        name: 'ThinkPad X1 Carbon',
        brand: 'Lenovo',
        model: 'X1 Carbon Gen 11',
        serialNumber: 'SN20240002',
        purchasePrice: 12999,
        purchaseDate: '2024-02-20',
        categoryId: savedCategories[0].id,
        locationId: savedLocations[5].id,
        status: AssetStatus.AVAILABLE,
        description: '商务办公笔记本',
        specifications: 'i7-1365U, 16GB内存, 1TB存储',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ThinkPad%20laptop%20black%20business&image_size=square',
      },
      {
        assetCode: 'AST003',
        name: 'iPhone 15 Pro',
        brand: 'Apple',
        model: 'iPhone 15 Pro 256GB',
        serialNumber: 'SN20240003',
        purchasePrice: 8999,
        purchaseDate: '2024-03-10',
        categoryId: savedCategories[0].id,
        locationId: savedLocations[2].id,
        status: AssetStatus.AVAILABLE,
        description: '企业办公手机',
        specifications: 'A17Pro芯片, 256GB, 钛金属',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=iPhone%2015%20Pro%20titanium&image_size=square',
      },
      {
        assetCode: 'AST004',
        name: '华为 MateBook X Pro',
        brand: '华为',
        model: 'MateBook X Pro 2024',
        serialNumber: 'SN20240004',
        purchasePrice: 11999,
        purchaseDate: '2024-01-25',
        categoryId: savedCategories[0].id,
        locationId: savedLocations[5].id,
        status: AssetStatus.AVAILABLE,
        description: '高端商务笔记本',
        specifications: 'Ultra9处理器, 32GB内存, 2TB存储',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Huawei%20MateBook%20laptop%20premium&image_size=square',
      },
      {
        assetCode: 'AST005',
        name: 'Dell 27寸 4K显示器',
        brand: 'Dell',
        model: 'U2723QE',
        serialNumber: 'SN20240005',
        purchasePrice: 4299,
        purchaseDate: '2024-02-15',
        categoryId: savedCategories[0].id,
        locationId: savedLocations[5].id,
        status: AssetStatus.AVAILABLE,
        description: '4K专业设计显示器',
        specifications: '3840x2160, IPS, 95% DCI-P3',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Dell%204K%20monitor%2027%20inch&image_size=square',
      },
      {
        assetCode: 'AST006',
        name: '人体工学办公椅',
        brand: '西昊',
        model: 'C300',
        serialNumber: 'SN20240006',
        purchasePrice: 2199,
        purchaseDate: '2024-03-01',
        categoryId: savedCategories[1].id,
        locationId: savedLocations[1].id,
        status: AssetStatus.AVAILABLE,
        description: '舒适办公椅',
        specifications: '带脚踏, 四维扶手, 网布',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ergonomic%20office%20chair%20modern&image_size=square',
      },
      {
        assetCode: 'AST007',
        name: '升降办公桌',
        brand: '乐歌',
        model: 'E6',
        serialNumber: 'SN20240007',
        purchasePrice: 2599,
        purchaseDate: '2024-03-05',
        categoryId: savedCategories[1].id,
        locationId: savedLocations[1].id,
        status: AssetStatus.AVAILABLE,
        description: '电动升降办公桌',
        specifications: '160x80cm, 双电机, 记忆高度',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=standing%20desk%20electric%20adjustable&image_size=square',
      },
      {
        assetCode: 'AST008',
        name: '博世电钻套装',
        brand: '博世',
        model: 'GSB 18V-55',
        serialNumber: 'SN20240008',
        purchasePrice: 899,
        purchaseDate: '2024-01-10',
        categoryId: savedCategories[3].id,
        locationId: savedLocations[3].id,
        status: AssetStatus.AVAILABLE,
        description: '充电式冲击钻',
        specifications: '18V, 55Nm扭矩, 两电一充',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Bosch%20cordless%20drill%20kit&image_size=square',
      },
      {
        assetCode: 'AST009',
        name: '投影仪',
        brand: '爱普生',
        model: 'CB-FH52',
        serialNumber: 'SN20240009',
        purchasePrice: 5999,
        purchaseDate: '2024-02-01',
        categoryId: savedCategories[0].id,
        locationId: savedLocations[2].id,
        status: AssetStatus.FROZEN,
        description: '高清商务投影仪',
        specifications: '1080P, 4000流明, 无线投屏',
        remark: '设备维护中',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Epson%20projector%20business%20presentation&image_size=square',
      },
      {
        assetCode: 'AST010',
        name: '别克 GL8',
        brand: '别克',
        model: 'GL8 陆尊 653T',
        serialNumber: 'SN20240010',
        purchasePrice: 359900,
        purchaseDate: '2024-01-05',
        categoryId: savedCategories[4].id,
        locationId: savedLocations[0].id,
        status: AssetStatus.AVAILABLE,
        description: '公司商务用车',
        specifications: '2.0T, 7座, 豪华版',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Buick%20GL8%20minivan%20silver&image_size=square',
      },
      {
        assetCode: 'AST011',
        name: 'Sony WH-1000XM5 耳机',
        brand: 'Sony',
        model: 'WH-1000XM5',
        serialNumber: 'SN20240011',
        purchasePrice: 2499,
        purchaseDate: '2024-03-15',
        categoryId: savedCategories[0].id,
        locationId: savedLocations[5].id,
        status: AssetStatus.AVAILABLE,
        description: '主动降噪耳机',
        specifications: '蓝牙5.2, 30小时续航, 头戴式',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Sony%20WH1000XM5%20headphones%20black&image_size=square',
      },
      {
        assetCode: 'AST012',
        name: '大疆 Mavic 3 无人机',
        brand: '大疆',
        model: 'Mavic 3 Classic',
        serialNumber: 'SN20240012',
        purchasePrice: 10888,
        purchaseDate: '2024-02-28',
        categoryId: savedCategories[0].id,
        locationId: savedLocations[3].id,
        status: AssetStatus.AVAILABLE,
        description: '航拍无人机',
        specifications: '4/3 CMOS, 46分钟续航, 15km传输',
        imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=DJI%20Mavic%20drone%20flying%20sky&image_size=square',
      },
    ];

    for (const assetData of assets) {
      const asset = assetRepo.create(assetData);
      await assetRepo.save(asset);
    }
    console.log(`✅ 已创建 ${assets.length} 个资产`);

    console.log('\n🎉 种子数据初始化完成！');
    console.log('\n📝 默认账号:');
    console.log('   超级管理员: admin / admin123');
    console.log('   资产管理员: manager / 123456');
    console.log('   普通用户: zhangsan / 123456');

    process.exit(0);
  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error);
    process.exit(1);
  }
}

seed();
