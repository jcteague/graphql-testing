import React, {useCallback} from 'react';
import gql from 'graphql-tag';
import {render, screen, waitFor, act, findByText, getByText, fireEvent} from '@testing-library/react'
import {ApolloProvider, useQuery, DocumentNode} from '@apollo/client';

import {createGraphQLFactory} from '..';
import '../matchers';
import '@shopify/react-testing/matchers';

const createGraphQL = createGraphQLFactory();

const petQuery: DocumentNode = gql`
  query Pet($id: ID!) {
    pet(id: $id) {
      ...CatInfo
    }
  }

  fragment CatInfo on Cat {
    name
  }
`;

function MyComponent({id = '1'} = {}) {
  const {data, loading, error, refetch} = useQuery(petQuery, {variables: {id}});

  const errorMarkup = error ? <p>Error</p> : null;
  const loadingMarkup = loading ? <p>Loading</p> : null;
  const petsMarkup =
    data != null && data.pet != null ? <p>{data.pet.name}</p> : null;
  const handleButtonClick = useCallback(() => refetch(), [refetch]);

  return (
    <>
      {loadingMarkup}
      {petsMarkup}
      {errorMarkup}
      <button onClick={handleButtonClick} type="button">
        Refetch
      </button>
    </>
  );
}

describe('graphql-testing', () => {
  it('does not resolve immediately', async() => {

    const graphQL = createGraphQL({
      Pet: {
        pet: {
          __typename: 'Cat',
          name: 'Garfield',
        },
      },
    });

    render(
      <ApolloProvider client={graphQL.client}>
        <MyComponent />
      </ApolloProvider>,
    );

    expect(graphQL).not.toHavePerformedGraphQLOperation(petQuery);
    await waitFor(() => screen.getByText('Loading'))
    expect(screen.getByText('Loading')).toBeTruthy;
  });

  it('resolves to an error when there is no matching mock set', async () => {
    const graphQL = createGraphQL();

    render(
      <ApolloProvider client={graphQL.client}>
        <MyComponent />
      </ApolloProvider>,
    );

    graphQL.wrap(resolve => act(resolve));
    await graphQL.resolveAll();

    expect(graphQL).toHavePerformedGraphQLOperation(petQuery);
    await waitFor(() => screen.getByText('Error'));
    expect(screen.getByText('Error')).toBeTruthy;
    
  });

  it('resolves a query with a provided mock', async () => {
    const id = '123';
    const name = 'Garfield';
    const graphQL = createGraphQL({
      Pet: {
        pet: {
          __typename: 'Cat',
          name: 'Garfield',
        },
      },
    });

    render(
      <ApolloProvider client={graphQL.client}>
        <MyComponent id={id} />
      </ApolloProvider>,
    );

    graphQL.wrap(resolve => act(resolve));
    await graphQL.resolveAll();

    expect(graphQL).toHavePerformedGraphQLOperation(petQuery, {
      id,
    });
    expect(screen.getByText(name)).toBeTruthy;
  });

//   it('allows for mock updates after it has been initialized', async () => {
//     const newName = 'Garfield2';
//     const graphQL = createGraphQL({
//       Pet: {
//         pet: {
//           __typename: 'Cat',
//           name: 'Garfield',
//         },
//       },
//     });

//     render(
//       <ApolloProvider client={graphQL.client}>
//         <MyComponent id="123" />
//       </ApolloProvider>,
//     );

//     graphQL.wrap(resolve => act(resolve));
//     await graphQL.resolveAll();

//     graphQL.update({
//       Pet: {
//         pet: {
//           __typename: 'Cat',
//           name: newName,
//         },
//       },
//     });
//     const button = await screen.findByText('Refetch');
//     fireEvent.click(button);
    
//     await graphQL.resolveAll();

//     expect(screen.findByText(newName)).toBeTruthy;
//   });
});
