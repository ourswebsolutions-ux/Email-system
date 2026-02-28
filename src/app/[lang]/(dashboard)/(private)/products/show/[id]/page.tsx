import { Grid, Container } from '@mui/material';


import { fetchProductsById } from '@/libs/fetchProductsById';
import type { ExtendedProducts } from '@/utils/types';

interface Params {
  id: string;
}


interface Props {
  params: Params;
  searchParams: { [key: string]: string | string[] | undefined };
}

const ProductsShow = async ({ params }: Props) => {

  // Fetch products and attendance data
  const products = await fetchProductsById(params.id);

  if (!products) return null;


  return (
    <Container>
      <Grid container spacing={4}>
        <Grid item xs={12}>
                  </Grid>
      </Grid>
    </Container>
  );
};

export default ProductsShow;
