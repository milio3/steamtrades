from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.db.session import Base

class Offer(Base):
    __tablename__ = 'offers'

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    app_id = Column(Integer, nullable=False, index=True)
    bundle = Column(String(255), default="", nullable=False, index=True)
    
    # Comprador
    buyer_name = Column(String(100), nullable=True, index=True)
    
    # Estado: 'pending', 'listed', 'sold', 'issue'
    status = Column(String(50), default='pending', index=True)
    is_reviewed = Column(Boolean, default=False)
    
    # Oferta recibida
    offer_price = Column(Float, nullable=False, default=1.0)
    offer_currency = Column(String(10), default='TF2')
    
    # Contraoferta
    counter_price = Column(Float, default=0.0)
    counter_currency = Column(String(10), default='TF2')
    
    # Datos de venta
    sold_price = Column(Float, nullable=True)
    sold_currency = Column(String(10), default='TF2')
    sold_note = Column(String(500), nullable=True)
    
    # Incidencia
    issue_note = Column(String(500), nullable=True)
    
    # Marcas de tiempo
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        ForeignKeyConstraint(['app_id', 'bundle'], ['games.app_id', 'games.bundle'], ondelete='CASCADE'),
    )

    # Relación con Game
    game = relationship('Game', back_populates='offers')

    # Propiedades de compatibilidad
    @property
    def tf2_keys_offered(self):
        return self.offer_price

    @tf2_keys_offered.setter
    def tf2_keys_offered(self, val):
        self.offer_price = val

    @property
    def counter_increase_tf2(self):
        return self.counter_price

    @counter_increase_tf2.setter
    def counter_increase_tf2(self, val):
        self.counter_price = val

    @property
    def is_sold(self):
        return self.status == 'sold'

    @is_sold.setter
    def is_sold(self, val):
        if val:
            self.status = 'sold'
        elif self.status == 'sold':
            self.status = 'pending'

    @property
    def sold_tf2_keys(self):
        return self.sold_price if self.sold_currency == 'TF2' else None
