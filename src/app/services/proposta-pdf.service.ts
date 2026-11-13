import { Injectable } from '@angular/core';
import { Pedido, ROTULO_PORTE_EMPRESA } from '../core/modelos';
import { dataCurta, horas, moeda } from '../shared/formatos';

export interface DadosProposta {
  pedido: Pedido;
  rotuloAmbiente: string;
  rotuloUrgencia: string;
  responsavel: string;
}

/**
 * Gera a proposta em PDF no próprio navegador (RF06).
 * A biblioteca jsPDF só é carregada quando o PDF é pedido,
 * para não pesar no carregamento das outras telas.
 */
@Injectable({ providedIn: 'root' })
export class PropostaPdfService {
  async gerar({ pedido, rotuloAmbiente, rotuloUrgencia, responsavel }: DadosProposta): Promise<void> {
    if (pedido.valor_final === null || pedido.horas_finais === null) {
      throw new Error('A revisão precisa ser salva antes de gerar a proposta.');
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margem = 20;
    const largura = 210 - margem * 2;
    let y = 24;

    const linha = (rotulo: string, valor: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text(rotulo, margem, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      const linhas = doc.splitTextToSize(valor, largura - 55);
      doc.text(linhas, margem + 55, y);
      y += Math.max(8, linhas.length * 6 + 2);
    };

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Katrinasec | Segurança ofensiva', margem, 9);

    doc.setTextColor(17, 24, 39);
    doc.setFontSize(20);
    doc.text('Proposta comercial', margem, (y += 8));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    doc.text(`Emitida em ${dataCurta(new Date().toISOString())}`, margem, (y += 7));
    y += 12;

    linha('Cliente', pedido.nome_cliente);
    linha('Porte da empresa', ROTULO_PORTE_EMPRESA[pedido.porte_empresa]);
    linha('Serviço', pedido.tipo_servico?.nome ?? '');
    linha('Porte do ambiente', rotuloAmbiente);
    linha('Urgência', rotuloUrgencia);
    linha('Horas previstas', horas(pedido.horas_finais));

    y += 4;
    doc.setDrawColor(229, 231, 235);
    doc.line(margem, y, margem + largura, y);
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    doc.text('Valor do serviço', margem, y);
    doc.setFontSize(22);
    doc.setTextColor(17, 24, 39);
    doc.text(moeda(pedido.valor_final), margem + 55, y + 1);
    y += 16;

    if (pedido.observacoes) linha('Observações', pedido.observacoes);
    linha('Responsável técnico', responsavel);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text('Documento gerado pelo OrçaSec.', margem, 285);

    const nomeArquivo = pedido.nome_cliente
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    doc.save(`proposta-${nomeArquivo || 'cliente'}.pdf`);
  }
}
