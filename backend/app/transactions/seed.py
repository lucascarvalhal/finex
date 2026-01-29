from datetime import date, timedelta
import random
from sqlalchemy.orm import Session
from app.models.transaction_db import TransactionDB

def seed_transactions(db: Session, user_id: int):
    """Popula dados de teste para o usuário com múltiplas moedas"""
    
    categorias_despesa = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Educação']
    descricoes_despesa = {
        'Alimentação': ['Supermercado', 'Restaurante', 'iFood', 'Padaria', 'Açougue'],
        'Transporte': ['Uber', 'Gasolina', 'Estacionamento', 'Manutenção carro', '99'],
        'Moradia': ['Aluguel', 'Condomínio', 'Luz', 'Água', 'Internet'],
        'Lazer': ['Netflix', 'Cinema', 'Spotify', 'Bar', 'Viagem'],
        'Saúde': ['Farmácia', 'Consulta médica', 'Academia', 'Plano de saúde'],
        'Educação': ['Curso online', 'Livros', 'Udemy', 'Mensalidade'],
    }
    
    descricoes_receita = {
        'BRL': ['Salário', 'Freelance Brasil', 'Venda ML', 'Cashback', 'Bônus'],
        'USD': ['Freelance Upwork', 'Dividendos EUA', 'Venda internacional', 'Consultoria US'],
        'EUR': ['Freelance Europa', 'Cliente Portugal', 'Dividendos EU', 'Consultoria EU'],
    }
    
    moedas = ['BRL', 'USD', 'EUR']
    moeda_weights = [0.7, 0.2, 0.1]  # 70% BRL, 20% USD, 10% EUR
    
    hoje = date.today()
    transacoes_criadas = []
    
    for i in range(120):  # 4 meses de dados
        data_trans = hoje - timedelta(days=i)
        
        # 1-4 despesas por dia (maioria em BRL)
        num_despesas = random.randint(1, 4)
        for _ in range(num_despesas):
            categoria = random.choice(categorias_despesa)
            descricao = random.choice(descricoes_despesa[categoria])
            
            # Despesas são 90% em BRL
            moeda = random.choices(['BRL', 'USD', 'EUR'], weights=[0.9, 0.07, 0.03])[0]
            
            if moeda == 'BRL':
                valor = round(random.uniform(15, 800), 2)
            elif moeda == 'USD':
                valor = round(random.uniform(10, 200), 2)
            else:
                valor = round(random.uniform(10, 180), 2)
            
            t = TransactionDB(
                user_id=user_id,
                tipo='despesa',
                valor=valor,
                categoria=categoria,
                descricao=descricao,
                data=data_trans,
                moeda=moeda
            )
            db.add(t)
            transacoes_criadas.append(t)
        
        # Receita a cada ~5-10 dias
        if i % random.randint(5, 10) == 0:
            moeda = random.choices(moedas, weights=moeda_weights)[0]
            descricao = random.choice(descricoes_receita[moeda])
            
            if moeda == 'BRL':
                valor = round(random.uniform(2000, 8000), 2)
            elif moeda == 'USD':
                valor = round(random.uniform(500, 3000), 2)
            else:
                valor = round(random.uniform(400, 2500), 2)
            
            t = TransactionDB(
                user_id=user_id,
                tipo='receita',
                valor=valor,
                categoria='Geral',
                descricao=descricao,
                data=data_trans,
                moeda=moeda
            )
            db.add(t)
            transacoes_criadas.append(t)
    
    db.commit()
    return len(transacoes_criadas)
