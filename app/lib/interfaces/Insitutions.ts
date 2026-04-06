export interface InstitutionsResponse {
    class: string[]
    actions: Action[]
    links: Link[]
    entities: Entity[]
  }
  
  export interface Action {
    name: string
    class: string[]
    method: string
    href: string
    fields: Field[]
  }
  
  export interface Field {
    name: string
    type: string
    min?: number
    max?: number
    step?: number
  }
  
  export interface Link {
    rel: string[]
    href: string
  }
  
  export interface Entity {
    class: string[]
    properties: Properties
    links: Link2[]
    entities: Entity2[]
    rel: string[]
  }
  
  export interface Properties {
    name: string
  }
  
  export interface Link2 {
    rel: string[]
    href: string
  }
  
  export interface Entity2 {
    rel: string[]
    href: string
  }
  