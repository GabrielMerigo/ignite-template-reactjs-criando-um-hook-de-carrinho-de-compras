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

export function CartProvider(props: CartProviderProps) {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const getExistingProductInCart = (productId: number) => cart.find((product) => product.id === productId);

  const increaseExistingProductAmountInCart = (productId: number) => {
    setCart((cart) => {
      const newCartState = cart.map((product) =>
        product.id === productId
          ? {
            ...product,
            amount: product.amount + 1,
          }
          : product
      );
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCartState))
      return newCartState;
    });
  };

  const addProduct = async (productId: number) => {
    try {
      const { data: productStock } = await api.get<Stock>(`/stock/${ productId }`);

      const existingProductInCart = getExistingProductInCart(productId);

      if (existingProductInCart) {
        const isProductAvailableInStock =
          existingProductInCart.amount < productStock.amount;

        if (!isProductAvailableInStock) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        increaseExistingProductAmountInCart(productId);
        return;
      }

      const { data: productToAdd } = await api.get(`/products/${ productId }`);

      setCart((cart) => {
        const newCartState = [...cart, { ...productToAdd, amount: 1 }];
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCartState))
        return newCartState;
      });
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existingProductInCart = getExistingProductInCart(productId);
      if (!existingProductInCart) {
        toast.error("Erro na remoção do produto");
        return;
      }
      
      setCart((cart) => {
        const newCartState = cart.filter((product) => product.id !== productId);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCartState))
        return newCartState;
      });
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`stock/${productId}`);
      if (amount > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } 
      const newProducts = cart.map(product => product.id === productId ? {
        ...product,
        amount
      } : {
        ...product
      })
      console.log(amount)
      setCart(newProducts)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newProducts));
 
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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