/**
 * Valores por defecto de la aplicación.
 * Se usan cuando no hay datos guardados en localStorage.
 */

export const DEFAULT_WORKERS = [
  { id: 'w1', name: 'Operador1',  pwd: 'changeme' },
  { id: 'w2', name: 'Operador2',  pwd: 'changeme' },
  { id: 'w3', name: 'Operador3',  pwd: 'changeme' },
]

export const DEFAULT_NAVES = [
  { id: 'n1', name: '17'    },
  { id: 'n2', name: '1'     },
  { id: 'n3', name: '13'    },
  { id: 'n4', name: '10'    },
  { id: 'n5', name: 'Nueva' },
]

export const DEFAULT_PROVIDERS = [
  { id: 'p1', name: 'Pactiv',  products: ['Charolas', 'Tapas', 'Contenedores']    },
  { id: 'p2', name: 'Arero',   products: ['Bolsas', 'Rollos']                     },
  { id: 'p3', name: 'Maver',   products: ['Cajas', 'Empaques']                    },
  { id: 'p4', name: 'Dart',    products: ['Vasos', 'Platos', 'Cubiertos']         },
  { id: 'p5', name: 'Desola',  products: ['Película stretch', 'Cinta']            },
  { id: 'p6', name: 'Biodeli', products: ['Empaques biodegradables']              },
]

export const DEFAULT_ADMIN = {
  username: 'admin',
  pin:      'changeme',
}

export const DEFAULT_ALMACENISTA = {
  username: 'almacen',
  pin:      '1234',
}

export const DEFAULT_FRASE = '"El único modo de hacer un gran trabajo es amar lo que haces." – Steve Jobs'
