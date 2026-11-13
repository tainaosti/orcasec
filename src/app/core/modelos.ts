export type Perfil = 'comercial' | 'especialista' | 'gestor';
export type StatusPedido = 'em_analise' | 'proposta_enviada' | 'fechado' | 'recusado';
export type PorteEmpresa = 'pequena' | 'media' | 'grande';
export type CategoriaConfiguracao = 'porte' | 'urgencia' | 'margem';

export interface Usuario {
  id: string;
  nome: string;
  perfil: Perfil;
  ativo: boolean;
}

export interface TipoServico {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor_hora: number;
  horas_base: number;
  ativo: boolean;
}

export interface Configuracao {
  id: number;
  categoria: CategoriaConfiguracao;
  opcao: string;
  rotulo: string;
  fator: number;
  ordem: number;
}

export interface Pedido {
  id: string;
  nome_cliente: string;
  porte_empresa: PorteEmpresa;
  tipo_servico_id: number;
  porte_ambiente: string;
  urgencia: string;
  valor_min: number;
  valor_max: number;
  horas_estimadas: number;
  valor_final: number | null;
  horas_finais: number | null;
  observacoes: string | null;
  status: StatusPedido;
  criado_por: string;
  revisado_por: string | null;
  criado_em: string;
  pdf_gerado_em: string | null;
  tipo_servico?: { nome: string } | null;
  criador?: { nome: string } | null;
  revisor?: { nome: string } | null;
}

/** Dados que a equipe comercial informa na triagem (RF02). */
export interface DadosTriagem {
  nome_cliente: string;
  porte_empresa: PorteEmpresa;
  tipo_servico_id: number;
  porte_ambiente: string;
  urgencia: string;
}

export const ROTULO_PERFIL: Record<Perfil, string> = {
  comercial: 'Comercial',
  especialista: 'Especialista',
  gestor: 'Gestor',
};

export const ROTULO_PORTE_EMPRESA: Record<PorteEmpresa, string> = {
  pequena: 'Pequena',
  media: 'Média',
  grande: 'Grande',
};

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  em_analise: 'Em análise',
  proposta_enviada: 'Proposta enviada',
  fechado: 'Fechado',
  recusado: 'Recusado',
};
