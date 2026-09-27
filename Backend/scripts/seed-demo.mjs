import dotenv from 'dotenv';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

dotenv.config();
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const api = process.env.TEST_API_URL ?? 'http://localhost:3000/api';
const adminEmail = process.env.TEST_ADMIN_EMAIL ?? 'adminprueba@rentacar.cl';
const adminPassword = process.env.TEST_ADMIN_PASSWORD ?? 'PruebaAdmin123';
const password = 'DemoSeed123!';

const dbConfig = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT ?? 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 4, min: 0, idleTimeoutMillis: 30000 },
};

const iso = (days) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const RESENA_COMENTARIOS = [
  'Excellente servicio, vehiculo impecable y entrega rapida.',
  'Muy buen estado del vehiculo, atencion cordial en la sede.',
  'Sin problemas, todo tal cual lo reservado.',
  'Vehiculo limpio y con buen kilometraje, recomendado.',
  'La devolucion fue rapida y sin observaciones.',
  'Buen precio y buen estado general del auto.',
];

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function expectOk(url, options) {
  const { status, data } = await request(url, options);
  if (!(status >= 200 && status < 300)) {
    throw new Error(`${status}: ${JSON.stringify(data)} (${url})`);
  }
  return data;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

async function login(emailValue, pass) {
  const session = await expectOk(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: emailValue, password: pass }),
  });
  return authHeaders(session.token);
}

async function run(pool, query, inputs = []) {
  const q = pool.request();
  inputs.forEach(([name, type, value]) => q.input(name, type, value));
  return q.query(query);
}

async function seedCatalogs(pool) {
  const counts = { regiones: 0, comunas: 0, marcas: 0, modelos: 0 };

  const regiones = [
    ['Region Metropolitana', ['Las Condes', 'Providencia', 'Maipu', 'Puente Alto']],
    ['Valparaiso', ['Valparaiso', 'Vina del Mar']],
    ['Ohiggins', ['Rancagua']],
    ['Maule', ['Talca', 'Curico']],
    ['Biobio', ['Concepcion']],
  ];

  const regionRows = await run(pool, 'SELECT ID_region, nombre_region FROM Region');
  const regionMap = new Map(regionRows.recordset.map((r) => [r.nombre_region, r.ID_region]));
  const comunaRows = await run(pool, 'SELECT nombre_comuna, ID_region_comuna FROM Comuna');
  const existingComunas = new Set(comunaRows.recordset.map((c) => `${c.ID_region_comuna}:${c.nombre_comuna}`));

  for (const [regionName, comunas] of regiones) {
    if (!regionMap.has(regionName)) {
      const inserted = await run(pool,
        'INSERT INTO Region(nombre_region) OUTPUT INSERTED.ID_region VALUES (@nombre);',
        [['nombre', sql.NVarChar(100), regionName]]);
      const regionId = inserted.recordset[0].ID_region;
      regionMap.set(regionName, regionId);
      counts.regiones += 1;
      for (const comuna of comunas) {
        await run(pool,
          'INSERT INTO Comuna(ID_region_comuna, nombre_comuna) VALUES (@regionId, @nombre);',
          [['regionId', sql.Int, regionId], ['nombre', sql.NVarChar(100), comuna]]);
        existingComunas.add(`${regionId}:${comuna}`);
      }
      counts.comunas += comunas.length;
    } else {
      const regionId = regionMap.get(regionName);
      for (const comuna of comunas) {
        if (existingComunas.has(`${regionId}:${comuna}`)) continue;
        await run(pool,
          'INSERT INTO Comuna(ID_region_comuna, nombre_comuna) VALUES (@regionId, @nombre);',
          [['regionId', sql.Int, regionId], ['nombre', sql.NVarChar(100), comuna]]);
        existingComunas.add(`${regionId}:${comuna}`);
        counts.comunas += 1;
      }
    }
  }

  const marcas = new Map([
    ['Chevrolet', ['Onix', 'Sail']],
    ['Mazda', ['CX-3', 'Mazda 3']],
    ['Nissan', ['Versa', 'Kicks']],
    ['Suzuki', ['Swift']],
    ['Jeep', ['Renegade']],
    ['Ford', ['Ranger']],
    ['Volkswagen', ['Polo']],
  ]);

  const marcaRows = await run(pool, 'SELECT ID_marca, nombre_marca FROM Marca');
  const marcaMap = new Map(marcaRows.recordset.map((m) => [m.nombre_marca, m.ID_marca]));
  const modelRows = await run(pool, 'SELECT ID_modelo, ID_marca_modelo, nombre_modelo FROM Modelo');
  const existingModels = new Set(modelRows.recordset.map((m) => `${m.ID_marca_modelo}:${m.nombre_modelo}`));

  for (const [marca, modelos] of marcas) {
    let marcaId = marcaMap.get(marca);
    if (!marcaId) {
      const inserted = await run(pool,
        'INSERT INTO Marca(nombre_marca) OUTPUT INSERTED.ID_marca VALUES (@nombre);',
        [['nombre', sql.VarChar(80), marca]]);
      marcaId = inserted.recordset[0].ID_marca;
      marcaMap.set(marca, marcaId);
      counts.marcas += 1;
    }
    for (const modelo of modelos) {
      if (existingModels.has(`${marcaId}:${modelo}`)) continue;
      await run(pool,
        'INSERT INTO Modelo(ID_marca_modelo, nombre_modelo) VALUES (@marcaId, @nombre);',
        [['marcaId', sql.Int, marcaId], ['nombre', sql.VarChar(100), modelo]]);
      existingModels.add(`${marcaId}:${modelo}`);
      counts.modelos += 1;
    }
  }

  return counts;
}

async function buildCatalogIndex(pool) {
  const communes = await run(pool, 'SELECT ID_comuna, nombre_comuna FROM Comuna');
  const comunas = new Map(communes.recordset.map((c) => [c.nombre_comuna, c.ID_comuna]));
  const types = await run(pool, 'SELECT ID_tipo_vehiculo, nombre_tipo_vehiculo FROM TipoVehiculo');
  const tipoVehiculo = new Map(types.recordset.map((t) => [t.nombre_tipo_vehiculo, t.ID_tipo_vehiculo]));
  const fuels = await run(pool, 'SELECT ID_tipo_combustible, nombre_tipo_combustible FROM TipoCombustible');
  const combustibles = new Map(fuels.recordset.map((f) => [f.nombre_tipo_combustible, f.ID_tipo_combustible]));
  const transmissions = await run(pool, 'SELECT ID_tipo_transmision, nombre_tipo_transmision FROM TipoTransmision');
  const transmisiones = new Map(transmissions.recordset.map((t) => [t.nombre_tipo_transmision, t.ID_tipo_transmision]));
  const models = await run(pool, `
    SELECT mo.ID_modelo, mo.nombre_modelo, m.nombre_marca
    FROM Modelo mo
    INNER JOIN Marca m ON m.ID_marca = mo.ID_marca_modelo
  `);
  const modelos = new Map(models.recordset.map((mo) => [`${mo.nombre_marca}:${mo.nombre_modelo}`, mo.ID_modelo]));
  return { comunas, tipoVehiculo, combustibles, transmisiones, modelos };
}

async function seedUsers(pool, catalog, existing) {
  const hash = bcrypt.hashSync(password, 10);
  let nuevo = 0;
  const usuarios = [];

  if (!existing.emails.has(adminEmail)) {
    const adminHash = bcrypt.hashSync(adminPassword, 10);
    let baseRut = 29333331;
    let rut;
    do {
      baseRut += 1;
      rut = `${baseRut}-0`;
    } while (existing.ruts.has(rut));
    existing.ruts.add(rut);

    const persona = await run(pool, `
      INSERT INTO Persona(rut_persona, nombres_persona, apellido_paterno_persona, apellido_materno_persona, telefono_persona)
      OUTPUT INSERTED.ID_persona
      VALUES (@rut, N'Administrador', N'RentaCar', N'Plataforma', '9 9999 9999');
    `, [['rut', sql.VarChar(12), rut]]);

    const user = await run(pool, `
      INSERT INTO Usuario(ID_persona_usuario, email_usuario, password_hash_usuario, activo_usuario, email_confirmado_usuario)
      OUTPUT INSERTED.ID_usuario
      VALUES (@personaId, @email, @hash, 1, 1);
    `, [
      ['personaId', sql.Int, persona.recordset[0].ID_persona],
      ['email', sql.VarChar(150), adminEmail],
      ['hash', sql.VarChar(255), adminHash],
    ]);

    const rolRow = await run(pool, "SELECT ID_rol FROM Rol WHERE nombre_rol = 'ADMIN';");
    await run(pool, `
      INSERT INTO UsuarioRol(ID_usuario_usuario_rol, ID_rol_usuario_rol)
      VALUES (@usuarioId, @rolId);
    `, [
      ['usuarioId', sql.Int, user.recordset[0].ID_usuario],
      ['rolId', sql.Int, rolRow.recordset[0].ID_rol],
    ]);
    nuevo += 1;
  }

  const build = async (rut, nombres, apellidoPaterno, apellidoMaterno, telefono, email, rol, esCliente) => {
    if (existing.emails.has(email)) {
      const row = await run(pool,
        'SELECT ID_usuario, a.ID_persona FROM Usuario u INNER JOIN Persona a ON a.ID_persona = u.ID_persona_usuario WHERE u.email_usuario = @email;',
        [['email', sql.VarChar(150), email]]);
      const record = row.recordset[0];
      return { usuarioId: record.ID_usuario, personaId: record.ID_persona, rol, email, nuevo: false };
    }

    let personaId;
    let baseRut = Number(rut.slice(0, -2));
    let uniqueRut;
    do {
      baseRut += 1;
      uniqueRut = `${baseRut}-${rut.slice(-1)}`;
    } while (existing.ruts.has(uniqueRut));

    existing.ruts.add(uniqueRut);
    const inserted = await run(pool, `
      INSERT INTO Persona(rut_persona, nombres_persona, apellido_paterno_persona, apellido_materno_persona, telefono_persona)
      OUTPUT INSERTED.ID_persona
      VALUES (@rut, @nombres, @apellidoP, @apellidoM, @telefono);
    `, [
      ['rut', sql.VarChar(12), uniqueRut],
      ['nombres', sql.NVarChar(80), nombres],
      ['apellidoP', sql.NVarChar(50), apellidoPaterno],
      ['apellidoM', sql.NVarChar(50), apellidoMaterno],
      ['telefono', sql.VarChar(20), telefono],
    ]);
    personaId = inserted.recordset[0].ID_persona;

    const insertedUser = await run(pool, `
      INSERT INTO Usuario(ID_persona_usuario, email_usuario, password_hash_usuario, activo_usuario, email_confirmado_usuario)
      OUTPUT INSERTED.ID_usuario
      VALUES (@personaId, @email, @hash, 1, 1);
    `, [
      ['personaId', sql.Int, personaId],
      ['email', sql.VarChar(150), email],
      ['hash', sql.VarChar(255), hash],
    ]);
    const usuarioId = insertedUser.recordset[0].ID_usuario;

    const rolRow = await run(pool, 'SELECT ID_rol FROM Rol WHERE nombre_rol = @rol;',
      [['rol', sql.VarChar(50), rol]]);
    await run(pool, `
      INSERT INTO UsuarioRol(ID_usuario_usuario_rol, ID_rol_usuario_rol)
      VALUES (@usuarioId, @rolId);
    `, [['usuarioId', sql.Int, usuarioId], ['rolId', sql.Int, rolRow.recordset[0].ID_rol]]);

    if (esCliente) {
      await run(pool, `
        INSERT INTO Cliente(ID_usuario_cliente)
        VALUES (@usuarioId);
      `, [['usuarioId', sql.Int, usuarioId]]);
    }

    nuevo += 1;
    return { usuarioId, personaId, email, rol, nuevo: true };
  };

  const clientes = [
    ['29111111-1', 'Sofia', 'Contreras', 'Moya', '9 1000 0001', 'cliente.demo1@rentacar.cl'],
    ['29111112-2', 'Matias', 'Silva', 'Reyes', '9 1000 0002', 'cliente.demo2@rentacar.cl'],
    ['29111113-3', 'Valentina', 'Muñoz', 'Salas', '9 1000 0003', 'cliente.demo3@rentacar.cl'],
    ['29111114-4', 'Sebastian', 'Gonzalez', 'Vidal', '9 1000 0004', 'cliente.demo4@rentacar.cl'],
    ['29111115-5', 'Antonia', 'Fuentes', 'Araya', '9 1000 0005', 'cliente.demo5@rentacar.cl'],
    ['29111116-6', 'Felipe', 'Castro', 'Navarro', '9 1000 0006', 'cliente.demo6@rentacar.cl'],
    ['29111117-7', 'Isidora', 'Riquelme', 'Diaz', '9 1000 0007', 'cliente.demo7@rentacar.cl'],
    ['29111118-8', 'Nicolas', 'Paredes', 'Leiva', '9 1000 0008', 'cliente.demo8@rentacar.cl'],
  ];

  const proveedores = [
    ['29222221-1', 'Andres', 'Saavedra', 'Pino', '9 2000 0001', 'proveedor.demo1@rentacar.cl'],
    ['29222222-2', 'Camila', 'Fernandez', 'Osses', '9 2000 0002', 'proveedor.demo2@rentacar.cl'],
    ['29222223-3', 'Rodrigo', 'Perez', 'Molina', '9 2000 0003', 'proveedor.demo3@rentacar.cl'],
    ['29222224-4', 'Javiera', 'Rojas', 'Silva', '9 2000 0004', 'proveedor.demo4@rentacar.cl'],
  ];

  for (const [rut, nombres, ap1, ap2, telefono, email] of clientes) {
    usuarios.push({
      ...(await build(rut, nombres, ap1, ap2, telefono, email, 'CLIENTE', true)),
      email,
    });
  }
  for (const [rut, nombres, ap1, ap2, telefono, email] of proveedores) {
    usuarios.push({
      ...(await build(rut, nombres, ap1, ap2, telefono, email, 'PROVEEDOR', false)),
    });
  }

  return { usuarios, nuevos: nuevo };
}

async function seedProviders(pool, usuarios) {
  const proveedores = [
    {
      tipo: 'EMPRESA',
      nombre: 'AutoSantiago',
      razonSocial: 'AutoSantiago SpA',
      rut: '76200001-K',
      telefono: '+56 2 2345 0001',
      email: 'contacto@autosantiago.cl',
      userEmail: 'proveedor.demo1@rentacar.cl',
    },
    {
      tipo: 'EMPRESA',
      nombre: 'Valpo Wheels',
      razonSocial: 'Valparaiso Wheels Ltda',
      rut: '76300002-6',
      telefono: '+56 32 231 0002',
      email: 'contacto@valpowheels.cl',
      userEmail: 'proveedor.demo2@rentacar.cl',
    },
    {
      tipo: 'PERSONA',
      nombre: 'SurRental',
      razonSocial: null,
      rut: null,
      telefono: '+56 9 8888 0003',
      email: 'contacto@surrental.cl',
      userEmail: 'proveedor.demo3@rentacar.cl',
    },
    {
      tipo: 'EMPRESA',
      nombre: 'Kars del Maule',
      razonSocial: 'Kars del Maule SpA',
      rut: '76400003-8',
      telefono: '+56 71 222 0004',
      email: 'contacto@karsmaule.cl',
      userEmail: 'proveedor.demo4@rentacar.cl',
    },
  ];

  const tipoRows = await run(pool, 'SELECT ID_tipo_proveedor, nombre_tipo_proveedor FROM TipoProveedor');
  const tipos = new Map(tipoRows.recordset.map((t) => [t.nombre_tipo_proveedor, t.ID_tipo_proveedor]));
  const estadoRows = await run(pool, `SELECT ID_estado_proveedor, nombre_estado_proveedor
    FROM EstadoProveedor WHERE nombre_estado_proveedor = 'PENDIENTE';`);
  const estadoPendiente = estadoRows.recordset[0].ID_estado_proveedor;

  const existingProviderRuts = new Set((await run(pool, 'SELECT rut_proveedor FROM Proveedor WHERE rut_proveedor IS NOT NULL;'))
    .recordset.map((p) => p.rut_proveedor));
  const userByEmail = new Map(usuarios.usuarios.filter((u) => u.rol === 'PROVEEDOR').map((u) => [u.email, u]));

  const creados = [];
  for (const prov of proveedores) {
    const user = userByEmail.get(prov.userEmail);
    const personalRut = prov.rut ?? 'DEMO-' + user.personaId;
    existingProviderRuts.add(personalRut);

    const existing = await run(pool, `
      SELECT p.ID_proveedor, p.nombre_comercial_proveedor, pu.ID_usuario_proveedor_usuario
      FROM Proveedor p
      LEFT JOIN ProveedorUsuario pu ON pu.ID_proveedor_proveedor_usuario = p.ID_proveedor
      WHERE p.nombre_comercial_proveedor = @nombre;
    `, [['nombre', sql.NVarChar(150), prov.nombre]]);

    if (existing.recordset.length > 0) {
      const row = existing.recordset[0];
      creados.push({ id: row.ID_proveedor, nombre: prov.nombre, tipo: prov.tipo, userEmail: prov.userEmail, nuevo: false });
      continue;
    }

    const proveedorResult = await run(pool, `
      INSERT INTO Proveedor(
        ID_tipo_proveedor_proveedor,
        ID_persona_proveedor,
        ID_estado_proveedor_proveedor,
        razon_social_proveedor,
        nombre_comercial_proveedor,
        rut_proveedor,
        telefono_proveedor,
        email_proveedor
      )
      VALUES (@tipo, @persona, @estado, @razon, @nombre, @rut, @telefono, @email);

      SELECT SCOPE_IDENTITY() AS ID_proveedor;
    `, [
      ['tipo', sql.Int, tipos.get(prov.tipo)],
      ['persona', sql.Int, prov.tipo === 'EMPRESA' ? null : user.personaId],
      ['estado', sql.Int, estadoPendiente],
      ['razon', sql.NVarChar(150), prov.razonSocial],
      ['nombre', sql.NVarChar(150), prov.nombre],
      ['rut', sql.VarChar(12), prov.rut],
      ['telefono', sql.VarChar(20), prov.telefono],
      ['email', sql.VarChar(150), prov.email],
    ]);
    const proveedorId = proveedorResult.recordset[0].ID_proveedor;

    await run(pool, `
      INSERT INTO ProveedorUsuario(ID_proveedor_proveedor_usuario, ID_usuario_proveedor_usuario, es_administrador_proveedor_usuario)
      VALUES (@proveedorId, @usuarioId, 1);
    `, [['proveedorId', sql.Int, proveedorId], ['usuarioId', sql.Int, user.usuarioId]]);

    await run(pool, `
      INSERT INTO ConfiguracionProveedor(ID_proveedor_configuracion_proveedor)
      VALUES (@proveedorId);
    `, [['proveedorId', sql.Int, proveedorId]]);

    creados.push({ id: proveedorId, nombre: prov.nombre, tipo: prov.tipo, userEmail: prov.userEmail, nuevo: true });
  }

  return creados;
}

const VEHICULOS = {
  'AutoSantiago': [
    ['Toyota:Corolla', 'SEDAN', 'GASOLINA', 'AUTOMATICA', 2023, 32400, 38900, 'ASGD01'],
    ['Hyundai:Tucson', 'SUV', 'GASOLINA', 'AUTOMATICA', 2022, 51200, 44900, 'ASGD02'],
    ['Kia:Rio', 'HATCHBACK', 'GASOLINA', 'AUTOMATICA', 2021, 68500, 27900, 'ASGD03'],
    ['Chevrolet:Onix', 'SEDAN', 'GASOLINA', 'MANUAL', 2023, 25100, 29900, 'ASGD04'],
    ['Suzuki:Swift', 'HATCHBACK', 'GASOLINA', 'MANUAL', 2022, 41800, 24900, 'ASGD05'],
  ],
  'Valpo Wheels': [
    ['Mazda:CX-3', 'SUV', 'GASOLINA', 'AUTOMATICA', 2023, 37700, 46900, 'VWGD01'],
    ['Mazda:Mazda 3', 'SEDAN', 'GASOLINA', 'AUTOMATICA', 2022, 44300, 42900, 'VWGD02'],
    ['Nissan:Versa', 'SEDAN', 'GASOLINA', 'MANUAL', 2023, 29000, 26900, 'VWGD03'],
    ['Nissan:Kicks', 'SUV', 'GASOLINA', 'AUTOMATICA', 2022, 47500, 39900, 'VWGD04'],
    ['Jeep:Renegade', 'SUV', 'GASOLINA', 'AUTOMATICA', 2023, 33900, 48900, 'VWGD05'],
  ],
  'SurRental': [
    ['Chevrolet:Sail', 'SEDAN', 'GASOLINA', 'MANUAL', 2021, 74200, 21900, 'SRGD01'],
    ['Toyota:Corolla', 'SEDAN', 'GASOLINA', 'MANUAL', 2022, 58900, 33900, 'SRGD02'],
    ['Ford:Ranger', 'PICKUP', 'DIESEL', 'MANUAL', 2022, 63400, 58900, 'SRGD03'],
    ['Volkswagen:Polo', 'HATCHBACK', 'GASOLINA', 'MANUAL', 2023, 28700, 28900, 'SRGD04'],
  ],
  'Kars del Maule': [
    ['Chevrolet:Onix', 'SEDAN', 'GASOLINA', 'MANUAL', 2023, 26300, 29900, 'KMGD01'],
    ['Nissan:Versa', 'SEDAN', 'GASOLINA', 'MANUAL', 2022, 52100, 25900, 'KMGD02'],
    ['Toyota:Corolla', 'SEDAN', 'GASOLINA', 'AUTOMATICA', 2023, 21700, 39900, 'KMGD03'],
    ['Hyundai:Tucson', 'SUV', 'GASOLINA', 'AUTOMATICA', 2022, 45300, 43900, 'KMGD04'],
    ['Kia:Rio', 'HATCHBACK', 'GASOLINA', 'AUTOMATICA', 2021, 71800, 26900, 'KMGD05'],
  ],
};

const SEDES = {
  'AutoSantiago': [
    ['Las Condes', 'Sede Las Condes', 'Av. Apoquindo 4900'],
    ['Providencia', 'Sede Providencia', 'Av. Providencia 1208'],
    ['Santiago', 'Sede Centro', 'Av. Santa Rosa 26'],
  ],
  'Valpo Wheels': [
    ['Vina del Mar', 'Sede Vina del Mar', 'Av. Libertad 500'],
    ['Valparaiso', 'Sede Valparaiso', 'Av. Argentina 356'],
    ['Concepcion', 'Sede Concepcion', 'Av. Paicavi 290'],
  ],
  'SurRental': [
    ['Rancagua', 'Sede Rancagua', 'Av. Cachapoal 1420'],
  ],
  'Kars del Maule': [
    ['Talca', 'Sede Talca', 'Av. San Miguel 1050'],
    ['Curico', 'Sede Curico', 'Av. Manso de Velasco 780'],
  ],
};

function vinGen(seed) {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let value = '';
  let state = seed * 2654435761;
  for (let i = 0; i < 17; i += 1) {
    state = (state * 1103515245 + 12345) >>> 0;
    value += chars[state % chars.length];
  }
  return value;
}

async function createProviderData(pool, catalog, adminHeaders, proveedor) {
  const sedes = SEDES[proveedor.nombre] ?? [];
  const vehiculosPlanned = VEHICULOS[proveedor.nombre] ?? [];

  const existingSedes = await expectOk(`${api}/proveedores/${proveedor.id}/sedes`, { headers: adminHeaders });
  const sedeNames = new Set(existingSedes.map((s) => s.nombre_sede_proveedor));
  const sedesCreadas = [];

  for (const [comuna, nombre, direccion] of sedes) {
    if (sedeNames.has(nombre)) {
      const row = existingSedes.find((s) => s.nombre_sede_proveedor === nombre);
      sedesCreadas.push({ id: row.ID_sede_proveedor, nuevo: false });
      continue;
    }
    const created = await expectOk(`${api}/proveedores/${proveedor.id}/sedes`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ idComuna: catalog.comunas.get(comuna), nombre, direccion }),
    });
    sedesCreadas.push({ id: created.id, nuevo: true });
  }

  const existingVehicles = await expectOk(`${api}/proveedores/${proveedor.id}/vehiculos`, { headers: adminHeaders });
  const patronesExistentes = new Set(existingVehicles.map((v) => v.patente_vehiculo));
  const vehiculosCreados = [];
  let vinCounter = 1000 + proveedor.id * 100;

  for (const [modeloKey, tipo, combustible, transmision, anio, kilometraje, precioDiario, patente] of vehiculosPlanned) {
    if (patronesExistentes.has(patente)) {
      const row = existingVehicles.find((v) => v.patente_vehiculo === patente);
      vehiculosCreados.push({ id: row.ID_vehiculo, patente, nuevo: false });
      continue;
    }
    const sedeActual = sedesCreadas[0].id;
    const created = await expectOk(`${api}/proveedores/${proveedor.id}/vehiculos`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        idSedeActual: sedeActual,
        idModelo: catalog.modelos.get(modeloKey),
        idTipoVehiculo: catalog.tipoVehiculo.get(tipo),
        idTipoCombustible: catalog.combustibles.get(combustible),
        idTipoTransmision: catalog.transmisiones.get(transmision),
        patente,
        vin: vinGen(vinCounter++),
        anio,
        kilometraje,
        precioDiario,
      }),
    });
    vehiculosCreados.push({ id: created.ID_vehiculo, patente, nuevo: true });
  }

  if (vehiculosCreados.length > 0 && sedesCreadas.length > 1) {
    const sedeExtra = sedesCreadas[1].id;
    for (const vehiculo of vehiculosCreados) {
      await expectOk(`${api}/proveedores/${proveedor.id}/vehiculos/${vehiculo.id}/sedes`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ idSede: sedeExtra, disponibleParaEntrega: true, disponibleParaDevolucion: true }),
      });
    }
  }

  await expectOk(`${api}/admin/proveedores/${proveedor.id}/estado`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ estado: 'APROBADO' }),
  });

  for (const vehiculo of vehiculosCreados) {
    await expectOk(`${api}/admin/vehiculos/${vehiculo.id}/publicacion`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ estado: 'PUBLICADO' }),
    });
  }

  return { sedesCreadas, vehiculosCreados };
}

async function createReservations(pool, catalog, adminHeaders) {
  const publicados = await expectOk(`${api}/vehiculos`);
  const byPlate = new Map(publicados.items.map((v) => [v.patente_vehiculo, v]));

  const plan = [
    { plate: 'ASGD01', cliente: 'cliente.demo1@rentacar.cl', inicio: 28, fin: 32, aprobado: true, cancelar: false },
    { plate: 'VWGD01', cliente: 'cliente.demo2@rentacar.cl', inicio: 35, fin: 38, aprobado: true, cancelar: false },
    { plate: 'SRGD01', cliente: 'cliente.demo3@rentacar.cl', inicio: 40, fin: 44, aprobado: true, cancelar: false },
    { plate: 'KMGD01', cliente: 'cliente.demo4@rentacar.cl', inicio: 20, fin: 24, aprobado: true, cancelar: false },
    { plate: 'ASGD02', cliente: 'cliente.demo5@rentacar.cl', inicio: 50, fin: 54, aprobado: true, cancelar: true },
    { plate: 'VWGD02', cliente: 'cliente.demo6@rentacar.cl', inicio: 60, fin: 63, aprobado: false, cancelar: false },
  ];

  const resumen = { confirmadas: 0, cancelada: 0, pendiente: 0, rechazada: 0, pagosAprobados: 0 };

  for (const item of plan) {
    const vehicle = byPlate.get(item.plate);
    if (!vehicle) {
      console.log(`  [skip] No publicado ${item.plate}`);
      continue;
    }
    const detail = await expectOk(`${api}/vehiculos/${vehicle.ID_vehiculo}`);
    const branch = detail.branches.find((b) => b.disponible_para_entrega !== 0);
    if (!branch) {
      console.log(`  [skip] Sin sedes operativas ${item.plate}`);
      continue;
    }

    const clientHeaders = await login(item.cliente, password);

    const yaExiste = await run(pool, `
      SELECT 1 AS existe
      FROM Reserva r
      INNER JOIN Vehiculo v ON v.ID_vehiculo = r.ID_vehiculo_reserva
      INNER JOIN Usuario u ON u.ID_usuario = r.ID_usuario_cliente_reserva
      WHERE v.patente_vehiculo = @patente
        AND u.email_usuario = @email
        AND r.fecha_inicio_reserva = @inicio
        AND r.fecha_fin_reserva = @fin;
    `, [
      ['patente', sql.VarChar(10), item.plate],
      ['email', sql.VarChar(150), item.cliente],
      ['inicio', sql.Date, iso(item.inicio)],
      ['fin', sql.Date, iso(item.fin)],
    ]);
    if (yaExiste.recordset.length > 0) {
      console.log(`  [skip] Reserva futura ${item.plate}`);
      continue;
    }

    const reserva = await expectOk(`${api}/reservas`, {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({
        idVehiculo: vehicle.ID_vehiculo,
        idSedeRetiro: branch.ID_sede_proveedor,
        idSedeDevolucion: branch.ID_sede_proveedor,
        fechaInicio: iso(item.inicio),
        fechaFin: iso(item.fin),
      }),
    });

    const inicioPago = await expectOk(`${api}/pagos/simulados/iniciar`, {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({ reservationId: reserva.ID_reserva }),
    });

    const confirmado = await expectOk(`${api}/pagos/simulados/${inicioPago.tokenWs}/confirmar`, {
      method: 'POST',
      headers: clientHeaders,
      body: JSON.stringify({ aprobado: item.aprobado }),
    });

    if (item.aprobado) {
      resumen.pagosAprobados += 1;
      if (item.cancelar) {
        await expectOk(`${api}/reservas/${reserva.ID_reserva}/cancelar`, {
          method: 'PATCH',
          headers: clientHeaders,
        });
        resumen.cancelada += 1;
      } else {
        resumen.confirmadas += 1;
      }
    } else {
      resumen.rechazada += 1;
      resumen.pendiente += 1;
    }
  }

  return resumen;
}

const HISTORICOS = [
  { plate: 'ASGD03', cliente: 'cliente.demo1@rentacar.cl', inicio: -45, dias: 6, kmIni: 30012, kmFin: 30840, combustibleFin: 45, calificacion: 5 },
  { plate: 'VWGD03', cliente: 'cliente.demo2@rentacar.cl', inicio: -60, dias: 5, kmIni: 25040, kmFin: 25870, combustibleFin: 38, calificacion: 5 },
  { plate: 'SRGD02', cliente: 'cliente.demo3@rentacar.cl', inicio: -80, dias: 4, kmIni: 42050, kmFin: 42810, combustibleFin: 62, calificacion: 4 },
  { plate: 'KMGD02', cliente: 'cliente.demo4@rentacar.cl', inicio: -25, dias: 6, kmIni: 18530, kmFin: 19360, combustibleFin: 40, calificacion: 5 },
  { plate: 'ASGD04', cliente: 'cliente.demo5@rentacar.cl', inicio: -90, dias: 7, kmIni: 6000, kmFin: 6470, combustibleFin: 55, calificacion: 5 },
  { plate: 'SRGD03', cliente: 'cliente.demo6@rentacar.cl', inicio: -15, dias: 3, kmIni: 54020, kmFin: 54670, combustibleFin: 35, calificacion: 4 },
];

async function seedHistorical(pool, catalog, providers) {
  const providerById = new Map(providers.map((p) => [p.id, p]));
  const mapaVehiculos = new Map();
  for (const proveedor of providers) {
    const list = await run(pool, `
      SELECT v.ID_vehiculo, v.patente_vehiculo, v.precio_diario_base_vehiculo, v.ID_proveedor_vehiculo
      FROM Vehiculo v WHERE v.ID_proveedor_vehiculo = @pid;
    `, [['pid', sql.Int, proveedor.id]]);
    list.recordset.forEach((v) => mapaVehiculos.set(v.patente_vehiculo, v));
  }

  const mapaUsuarios = new Map(
    (await run(pool, "SELECT ID_usuario, email_usuario FROM Usuario WHERE email_usuario LIKE 'cliente.demo%';"))
      .recordset.map((u) => [u.email_usuario, u.ID_usuario]));

  const res = (await run(pool, `
    SELECT er1.ID_estado_reserva AS completada,
           ea1.ID_estado_arriendo AS finalizado,
           ep1.ID_estado_pago AS aprobado,
           mp.ID_metodo_pago,
           sp1.ID_sede_proveedor
    FROM (SELECT ID_estado_reserva FROM EstadoReserva WHERE nombre_estado_reserva = 'COMPLETADA') er1
    CROSS JOIN (SELECT ID_estado_arriendo FROM EstadoArriendo WHERE nombre_estado_arriendo = 'FINALIZADO') ea1
    CROSS JOIN (SELECT ID_estado_pago FROM EstadoPago WHERE nombre_estado_pago = 'APROBADO') ep1
    CROSS JOIN (SELECT TOP 1 ID_metodo_pago FROM MetodoPago WHERE activo_metodo_pago = 1 ORDER BY ID_metodo_pago) mp
    CROSS JOIN (SELECT TOP 1 ID_sede_proveedor FROM SedeProveedor ORDER BY ID_sede_proveedor) sp1;
  `));
  const refs = res.recordset[0];
  const sedesByProvider = new Map();
  for (const proveedor of providers) {
    const rows = await run(pool, `
      SELECT ID_sede_proveedor FROM SedeProveedor
      WHERE ID_proveedor_sede_proveedor = @pid AND activo_sede_proveedor = 1;
    `, [['pid', sql.Int, proveedor.id]]);
    sedesByProvider.set(proveedor.id, rows.recordset[0].ID_sede_proveedor);
  }

  let creados = 0;
  for (let index = 0; index < HISTORICOS.length; index += 1) {
    const h = HISTORICOS[index];
    const vehicle = mapaVehiculos.get(h.plate);
    const usuarioId = mapaUsuarios.get(h.cliente);
    if (!vehicle || !usuarioId) continue;

    const marker = `seed-demo-historica-${index}`;
    const already = await run(pool,
      'SELECT 1 AS existe FROM Reserva WHERE observaciones_reserva = @marker;',
      [['marker', sql.NVarChar(500), marker]]);
    if (already.recordset.length > 0) {
      console.log(`  [skip] Historica ${h.plate}`);
      continue;
    }

    const proveedor = providerById.get(vehicle.ID_proveedor_vehiculo);
    const sedeId = sedesByProvider.get(vehicle.ID_proveedor_vehiculo);
    const fechaInicio = iso(h.inicio);
    const fechaFin = iso(h.inicio + h.dias);
    const monto = h.dias * Number(vehicle.precio_diario_base_vehiculo);

    const reservaInsert = await run(pool, `
      INSERT INTO Reserva(
        ID_usuario_cliente_reserva,
        ID_vehiculo_reserva,
        ID_sede_retiro_reserva,
        ID_sede_devolucion_reserva,
        ID_estado_reserva_reserva,
        fecha_inicio_reserva,
        fecha_fin_reserva,
        precio_diario_aplicado_reserva,
        observaciones_reserva
      )
      VALUES (@usuarioId, @vehiculoId, @sedeId, @sedeId, @estadoReserva, @fechaInicio, @fechaFin, @precio, @marker);

      SELECT SCOPE_IDENTITY() AS ID_reserva;
    `, [
      ['usuarioId', sql.Int, usuarioId],
      ['vehiculoId', sql.Int, vehicle.ID_vehiculo],
      ['sedeId', sql.Int, sedeId],
      ['estadoReserva', sql.Int, refs.completada],
      ['fechaInicio', sql.Date, fechaInicio],
      ['fechaFin', sql.Date, fechaFin],
      ['precio', sql.Decimal(12, 2), vehicle.precio_diario_base_vehiculo],
      ['marker', sql.NVarChar(500), marker],
    ]);
    const reservaId = reservaInsert.recordset[0].ID_reserva;

    await run(pool, `
      INSERT INTO Pago(ID_reserva_pago, ID_metodo_pago_pago, ID_estado_pago_pago, monto_pago, referencia_proveedor_pago, fecha_pago)
      VALUES (@reservaId, @metodo, @estadoPago, @monto, @referencia, @fechaPago);
    `, [
      ['reservaId', sql.Int, reservaId],
      ['metodo', sql.Int, refs.ID_metodo_pago],
      ['estadoPago', sql.Int, refs.aprobado],
      ['monto', sql.Decimal(12, 2), monto],
      ['referencia', sql.VarChar(100), `SEED-${fechaInicio}`],
      ['fechaPago', sql.DateTime2, new Date(`${fechaInicio} 10:00:00`)],
    ]);

    const arriendoResult = await run(pool, `
      INSERT INTO Arriendo(
        ID_reserva_arriendo,
        ID_sede_retiro_real_arriendo,
        ID_sede_devolucion_real_arriendo,
        ID_estado_arriendo_arriendo,
        fecha_hora_retiro_real_arriendo,
        fecha_hora_devolucion_real_arriendo,
        kilometraje_inicial_arriendo,
        kilometraje_final_arriendo,
        combustible_inicial_arriendo,
        combustible_final_arriendo
      )
      VALUES (@reservaId, @sedeId, @sedeId, @estadoArriendo, @retiro, @devolucion, @kmIni, @kmFin, @combIni, @combFin);

      SELECT SCOPE_IDENTITY() AS ID_arriendo;
    `, [
      ['reservaId', sql.Int, reservaId],
      ['sedeId', sql.Int, sedeId],
      ['estadoArriendo', sql.Int, refs.finalizado],
      ['retiro', sql.DateTime2, new Date(`${fechaInicio}T10:30:00.000`)],
      ['devolucion', sql.DateTime2, new Date(`${fechaFin}T17:30:00.000`)],
      ['kmIni', sql.Int, h.kmIni],
      ['kmFin', sql.Int, h.kmFin],
      ['combIni', sql.Decimal(5, 2), 90],
      ['combFin', sql.Decimal(5, 2), h.combustibleFin],
    ]);
    const arriendoId = arriendoResult.recordset[0].ID_arriendo;

    await run(pool, `
      INSERT INTO Resena(ID_arriendo_resena, calificacion_resena, comentario_resena)
      VALUES (@arriendoId, @calificacion, @comentario);
    `, [
      ['arriendoId', sql.Int, arriendoId],
      ['calificacion', sql.TinyInt, h.calificacion],
      ['comentario', sql.NVarChar(1000), RESENA_COMENTARIOS[index % RESENA_COMENTARIOS.length]],
    ]);

    creados += 1;
  }

  return creados;
}

async function main() {
  const counts = { usuariosNuevos: 0, proveedoresNuevos: 0, sedes: 0, vehiculos: 0 };

  const pool = await sql.connect(dbConfig);
  try {
    console.log('Conectado a SQL Server.');

  const catalogCounts = await seedCatalogs(pool);
  console.log(`Catalogo: +${catalogCounts.regiones} regiones, +${catalogCounts.comunas} comunas, +${catalogCounts.marcas} marcas, +${catalogCounts.modelos} modelos.`);

  const catalog = await buildCatalogIndex(pool);

  const personas = await run(pool, `
    SELECT rut_persona FROM Persona
    UNION
    SELECT rut_proveedor FROM Proveedor WHERE rut_proveedor IS NOT NULL;
  `);
  const existingRuts = new Set(personas.recordset.map((r) => r.rut_persona ?? r.rut_proveedor));
  const emailsRows = await run(pool, 'SELECT email_usuario FROM Usuario;');
  const existingEmails = new Set(emailsRows.recordset.map((u) => u.email_usuario));

  const usuarios = await seedUsers(pool, catalog, { ruts: existingRuts, emails: existingEmails });
  counts.usuariosNuevos = usuarios.nuevos;
  console.log(`Usuarios demo: ${usuarios.usuarios.length} en total, +${usuarios.nuevos} creados (8 clientes + 4 proveedores + 1 admin).`);

  const proveedores = await seedProviders(pool, usuarios);
  counts.proveedoresNuevos = proveedores.filter((p) => p.nuevo).length;
  console.log(`Proveedores: ${proveedores.length} en total, +${counts.proveedoresNuevos} creados.`);

  const adminHeaders = await login(adminEmail, adminPassword);
  console.log('Sesion de administrador obtenida.\nCreando sedes y vehiculos via API...');

  const vehiculosPorProveedor = new Map();
  for (const proveedor of proveedores) {
    const resultado = await createProviderData(pool, catalog, adminHeaders, proveedor);
    counts.sedes += resultado.sedesCreadas.filter((s) => s.nuevo).length;
    counts.vehiculos += resultado.vehiculosCreados.filter((v) => v.nuevo).length;
    vehiculosPorProveedor.set(proveedor.id, resultado.vehiculosCreados);
    console.log(`  ${proveedor.nombre}: ${resultado.sedesCreadas.length} sedes (${counts.sedes} nuevas acumuladas), ${resultado.vehiculosCreados.length} vehiculos(${counts.vehiculos} nuevos acumulados).`);
  }

  console.log('Creando reservas futuras y pagos simulados via API...');
  const reservas = await createReservations(pool, catalog, adminHeaders);
  console.log(`  Reservas futuras: ${reservas.confirmadas} CONFIRMADA, ${reservas.cancelada} CANCELADA/REEMBOLSADO, ${reservas.rechazada} con pago RECHAZADO (PENDIENTE), pagos aprobados: ${reservas.pagosAprobados}.`);

  console.log('Insertando actividad historica (arriendos finalizados y resenas)...');
  const historicos = await seedHistorical(pool, catalog, proveedores);
  console.log(`  Historicos: +${historicos} arriendos finalizados con resena.`);

  const catalogo = await expectOk(`${api}/catalogos/vehiculos`);
  const resumen = await expectOk(`${api}/admin/resumen`, { headers: adminHeaders });
  const totals = resumen.totals;

  console.log('\n=== Resumen final ===');
  console.log(`Catalogos: ${catalogo.communes.length} comunas, ${catalogo.brands.length} marcas, ${catalogo.models.length} modelos.`);
  console.log(`Usuarios totales: ${totals.total_usuarios}`);
  console.log(`Proveedores totales: ${totals.total_proveedores}`);
  console.log(`Vehiculos totales: ${totals.total_vehiculos}`);
  console.log(`Reservas totales: ${totals.total_reservas}`);
  console.log(`Ingresos simulados (pagos aprobados): $${Number(totals.ingresos_simulados).toLocaleString('es-CL')}`);
  console.log(`Publicados: ${(resumen.publicaciones.find((p) => p.concepto === 'PUBLICADO')?.cantidad ?? 0)}`);

  console.log('Seed demo completado.');
  } catch (error) {
    console.error('Seed demo fallo:', error);
    process.exitCode = 1;
  } finally {
    if (pool.connected) await pool.close();
  }
}

main();