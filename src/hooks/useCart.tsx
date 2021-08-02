import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider(props: CartProviderProps){
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart];
      const productsExists = updateCart.find(product => product.id === productId)
      const stock = await api.get(`stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productsExists ? productsExists.amount : 0;
      const amount = currentAmount + 1;

      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      console.log(amount, stockAmount)
      if(productsExists){
        productsExists.amount = amount;
      }else{
        const product = await api.get(`products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1
        };
        updateCart.push(newProduct)
      }
      
      setCart(updateCart)
      const dadosTransformados = JSON.stringify(updateCart)
      localStorage.setItem('@RocketShoes:cart', dadosTransformados)
    } catch(err) {
      toast.error('Deu ruim...')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = [...cart];
      const removedProduct = product.filter(product => product.id !== productId)
      setCart(removedProduct)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(removedProduct))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }
      
      const stock = await api.get(`stock/${productId}`);

      if(amount > stock.data.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updateCart = [...cart];
      const currentProduct = updateCart.find(product => product.id === productId);

      
      if(currentProduct){
        currentProduct.amount = amount;
        setCart(updateCart);
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {props.children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}